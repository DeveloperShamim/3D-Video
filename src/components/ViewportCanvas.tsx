import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  LIGHTING_MOODS,
  RecordedVideo,
  SCENE_PRESETS,
  ScenePresetId,
  StudioConfig,
} from '../types/studio';
import { createProceduralTextures } from '../three/proceduralTextures';
import { createStudioMaterialLibrary } from '../three/materials';
import { AnimatedSceneController } from '../three/scenes/types';
import { createKahfSanctuaryScene } from '../three/scenes/kahfSanctuaryScene';
import { createChronometerScene } from '../three/scenes/chronometerScene';
import { createArchitectureScene } from '../three/scenes/architectureScene';
import { createRoverScene } from '../three/scenes/roverScene';
import { createObservatoryScene } from '../three/scenes/observatoryScene';
import { VoiceoverAudioEngine } from '../three/audioEngine';
import { ActiveRecordingSession, startCanvasVideoRecording } from '../three/videoRecorder';
import { SrtCue, getActiveCue } from '../utils/srtParser';

export interface ViewportHandle {
  takeSnapshot: () => void;
  startRecording: () => void;
  cancelRecording: () => void;
  resetCamera: () => void;
  seekAudio: (time: number) => void;
}

interface ViewportCanvasProps {
  config: StudioConfig;
  voUrl: string;
  srtCues: SrtCue[];
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onCameraManualOverride: () => void;
  onRecordingStateChange: (recording: boolean, progress: number) => void;
  onVideoReady: (video: RecordedVideo) => void;
  onVoDurationLoaded: (duration: number) => void;
  onAutoplayBlocked: (blocked: boolean) => void;
  onError: (msg: string) => void;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _desiredCamPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function buildSceneById(
  id: ScenePresetId,
  ctx: Parameters<typeof createChronometerScene>[0],
): AnimatedSceneController {
  switch (id) {
    case 'kahf-sanctuary':
      return createKahfSanctuaryScene(ctx);
    case 'architecture':
      return createArchitectureScene(ctx);
    case 'rover':
      return createRoverScene(ctx);
    case 'observatory':
      return createObservatoryScene(ctx);
    case 'chronometer':
    default:
      return createChronometerScene(ctx);
  }
}

export const ViewportCanvas = forwardRef<ViewportHandle, ViewportCanvasProps>(
  function ViewportCanvas(
    {
      config,
      voUrl,
      srtCues,
      isPlaying,
      currentTime,
      onTimeUpdate,
      onPlayingChange,
      onCameraManualOverride,
      onRecordingStateChange,
      onVideoReady,
      onVoDurationLoaded,
      onAutoplayBlocked,
      onError,
    },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextLost, setContextLost] = useState(false);

    // Keep latest props & callbacks in refs so WebGL mounts once
    const configRef = useRef(config);
    configRef.current = config;

    const srtCuesRef = useRef(srtCues);
    srtCuesRef.current = srtCues;

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    const timeRef = useRef(currentTime);
    timeRef.current = currentTime;

    const callbacksRef = useRef({
      onTimeUpdate,
      onPlayingChange,
      onCameraManualOverride,
      onRecordingStateChange,
      onVideoReady,
      onVoDurationLoaded,
      onAutoplayBlocked,
      onError,
    });
    callbacksRef.current = {
      onTimeUpdate,
      onPlayingChange,
      onCameraManualOverride,
      onRecordingStateChange,
      onVideoReady,
      onVoDurationLoaded,
      onAutoplayBlocked,
      onError,
    };

    const runtimeRef = useRef<{
      renderer: THREE.WebGLRenderer | null;
      scene: THREE.Scene | null;
      camera: THREE.PerspectiveCamera | null;
      controls: OrbitControls | null;
      composer: EffectComposer | null;
      bokehPass: BokehPass | null;
      bloomPass: UnrealBloomPass | null;
      audio: VoiceoverAudioEngine | null;
      activeScene: AnimatedSceneController | null;
      activeSceneId: ScenePresetId | null;
      materials: ReturnType<typeof createStudioMaterialLibrary> | null;
      textures: ReturnType<typeof createProceduralTextures> | null;
      keyLight: THREE.DirectionalLight | null;
      hemiLight: THREE.HemisphereLight | null;
      rimLight: THREE.DirectionalLight | null;
      softLeftLight: THREE.RectAreaLight | null;
      softTopLight: THREE.RectAreaLight | null;
      floorMesh: THREE.Mesh | null;
      isSoftwareGl: boolean;
      recordingSession: ActiveRecordingSession | null;
      isRecording: boolean;
      recordElapsed: number;
      renderNow: () => void;
    }>({
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      composer: null,
      bokehPass: null,
      bloomPass: null,
      audio: null,
      activeScene: null,
      activeSceneId: null,
      materials: null,
      textures: null,
      keyLight: null,
      hemiLight: null,
      rimLight: null,
      softLeftLight: null,
      softTopLight: null,
      floorMesh: null,
      isSoftwareGl: false,
      recordingSession: null,
      isRecording: false,
      recordElapsed: 0,
      renderNow: () => {},
    });

    // Imperative studio actions
    useImperativeHandle(ref, () => ({
      takeSnapshot: () => {
        const rt = runtimeRef.current;
        if (!rt.renderer || !rt.scene || !rt.camera) return;
        rt.renderNow();
        try {
          const dataUrl = rt.renderer.domElement.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `ashab-al-kahf-${configRef.current.sceneId}-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        } catch {
          callbacksRef.current.onError('Unable to capture snapshot from WebGL canvas.');
        }
      },
      startRecording: () => {
        const rt = runtimeRef.current;
        if (!rt.renderer || rt.isRecording) return;
        const cfg = configRef.current;
        const sceneMeta =
          SCENE_PRESETS.find((s) => s.id === cfg.sceneId) ?? SCENE_PRESETS[0];

        try {
          if (rt.audio) {
            rt.audio.seekTo(0);
            rt.audio.syncPlayback({
              playing: true,
              enabled: cfg.audioEnabled,
              timelineTime: 0,
              speed: 1,
            });
          }
          const audioTrack =
            cfg.audioEnabled && rt.audio ? rt.audio.getAudioTrack() : null;
          const session = startCanvasVideoRecording({
            webglCanvas: rt.renderer.domElement,
            fps: cfg.fps,
            duration: cfg.duration,
            sceneName: sceneMeta.name,
            audioTrack,
          });
          rt.recordingSession = session;
          rt.isRecording = true;
          rt.recordElapsed = 0;
          timeRef.current = 0;
          callbacksRef.current.onTimeUpdate(0);
          callbacksRef.current.onPlayingChange(true);
          callbacksRef.current.onRecordingStateChange(true, 0);
        } catch (err) {
          callbacksRef.current.onError(
            err instanceof Error ? err.message : 'Failed to start video recording.',
          );
        }
      },
      cancelRecording: () => {
        const rt = runtimeRef.current;
        if (!rt.isRecording || !rt.recordingSession) return;
        rt.recordingSession.cancel();
        rt.recordingSession = null;
        rt.isRecording = false;
        callbacksRef.current.onRecordingStateChange(false, 0);
      },
      resetCamera: () => {
        const rt = runtimeRef.current;
        const meta =
          SCENE_PRESETS.find((s) => s.id === configRef.current.sceneId) ??
          SCENE_PRESETS[0];
        if (rt.camera && rt.controls) {
          rt.camera.position.set(
            meta.defaultRadius * 0.3,
            meta.defaultTarget[1] + 0.35,
            meta.defaultRadius * 1.05,
          );
          rt.controls.target.set(...meta.defaultTarget);
          rt.controls.update();
        }
      },
      seekAudio: (time: number) => {
        runtimeRef.current.audio?.seekTo(time);
      },
    }));

    // Sync scene preset changes cleanly without tearing down WebGLRenderer
    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt.scene || !rt.materials || !rt.textures) return;
      if (rt.activeSceneId === config.sceneId) return;

      if (rt.activeScene) {
        rt.scene.remove(rt.activeScene.group);
        rt.activeScene.dispose();
        rt.activeScene = null;
      }

      const nextScene = buildSceneById(config.sceneId, {
        materials: rt.materials,
        textures: rt.textures,
        isSoftwareGl: rt.isSoftwareGl,
      });
      rt.scene.add(nextScene.group);
      rt.activeScene = nextScene;
      rt.activeSceneId = config.sceneId;

      if (rt.floorMesh) {
        rt.floorMesh.visible =
          config.sceneId !== 'kahf-sanctuary' && config.sceneId !== 'rover';
      }

      const meta =
        SCENE_PRESETS.find((s) => s.id === config.sceneId) ?? SCENE_PRESETS[0];
      if (rt.camera && rt.controls && config.cameraShot === 'free-orbit') {
        rt.controls.target.set(...meta.defaultTarget);
        rt.camera.position.set(
          meta.defaultRadius * 0.3,
          meta.defaultTarget[1] + 0.35,
          meta.defaultRadius * 1.05,
        );
        rt.controls.update();
      }
    }, [config.sceneId, config.cameraShot]);

    // Sync voiceover audio URL
    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt.audio || !voUrl) return;
      rt.audio.loadSource(voUrl);
    }, [voUrl]);

    // Sync lighting mood
    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt.scene || !rt.keyLight || !rt.hemiLight || !rt.rimLight) return;
      const mood =
        LIGHTING_MOODS.find((m) => m.id === config.lightingMood) ??
        LIGHTING_MOODS[0];

      rt.scene.background = new THREE.Color(mood.bgHex);
      rt.scene.fog = new THREE.FogExp2(mood.fogHex, mood.fogDensity);
      rt.scene.environmentIntensity = 1.0;
      rt.keyLight.color.setHex(mood.keyHex);
      rt.keyLight.intensity = mood.keyIntensity;
      rt.hemiLight.color.setHex(mood.hemiSkyHex);
      rt.hemiLight.groundColor.setHex(mood.hemiGroundHex);
      rt.hemiLight.intensity = mood.hemiIntensity;
      rt.rimLight.color.setHex(mood.rimHex);
      rt.rimLight.intensity = mood.rimIntensity;
      if (rt.softLeftLight) rt.softLeftLight.intensity = 1.8;
      if (rt.softTopLight) rt.softTopLight.intensity = 1.4;
    }, [config.lightingMood]);

    // Sync material finish
    useEffect(() => {
      const rt = runtimeRef.current;
      if (!rt.materials) return;
      rt.materials.applyFinish(config.materialFinish);
    }, [config.materialFinish]);

    // Sync bloom pass
    useEffect(() => {
      const rt = runtimeRef.current;
      if (rt.bloomPass) {
        rt.bloomPass.enabled = config.bloomEnabled && !rt.isSoftwareGl;
      }
    }, [config.bloomEnabled]);

    // Main WebGL initialization (runs strictly once on mount)
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareWebGL();
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      container.appendChild(renderer.domElement);

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const handleContextRestored = () => {
        setContextLost(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );

      // Scene & Studio Environment Map
      const scene = new THREE.Scene();
      const initialMood =
        LIGHTING_MOODS.find((m) => m.id === configRef.current.lightingMood) ??
        LIGHTING_MOODS[0];
      scene.background = new THREE.Color(initialMood.bgHex);
      scene.fog = new THREE.FogExp2(initialMood.fogHex, initialMood.fogDensity);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      // Camera & OrbitControls
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
      const initMeta =
        SCENE_PRESETS.find((s) => s.id === configRef.current.sceneId) ??
        SCENE_PRESETS[0];
      camera.position.set(
        0,
        initMeta.defaultTarget[1] + 0.3,
        initMeta.defaultRadius * 1.2,
      );

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...initMeta.defaultTarget);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.4;
      controls.maxDistance = 26;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.update();

      const handleControlsStart = () => {
        if (configRef.current.cameraShot !== 'free-orbit') {
          callbacksRef.current.onCameraManualOverride();
        }
      };
      controls.addEventListener('start', handleControlsStart);

      // 3-Point Warm/Cool Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(
        initialMood.hemiSkyHex,
        initialMood.hemiGroundHex,
        initialMood.hemiIntensity,
      );
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(
        initialMood.keyHex,
        initialMood.keyIntensity,
      );
      keyLight.position.set(8, 10, 8);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 38;
      keyLight.shadow.camera.left = -14;
      keyLight.shadow.camera.right = 14;
      keyLight.shadow.camera.top = 14;
      keyLight.shadow.camera.bottom = -14;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(
        initialMood.rimHex,
        initialMood.rimIntensity,
      );
      rimLight.position.set(-8, 5.5, -8);
      scene.add(rimLight);

      // Studio Softbox Area Lights (GPU only)
      let softLeftLight: THREE.RectAreaLight | null = null;
      let softTopLight: THREE.RectAreaLight | null = null;
      if (!isSoftwareGl) {
        RectAreaLightUniformsLib.init();
        softLeftLight = new THREE.RectAreaLight(0xffffff, 1.8, 5, 3);
        softLeftLight.position.set(-5.5, 4.5, 2.5);
        softLeftLight.lookAt(0, 1.8, 0);
        scene.add(softLeftLight);

        softTopLight = new THREE.RectAreaLight(0xfff4e0, 1.4, 4, 4);
        softTopLight.position.set(0, 7.5, 0);
        softTopLight.lookAt(0, 1.4, 0);
        scene.add(softTopLight);
      }

      // Grounding Studio Floor Plane
      const textures = createProceduralTextures(
        renderer.capabilities.getMaxAnisotropy(),
      );
      const materials = createStudioMaterialLibrary(textures, isSoftwareGl);
      materials.applyFinish(configRef.current.materialFinish);

      const floorGeo = new THREE.CircleGeometry(30, 72);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMesh = new THREE.Mesh(floorGeo, materials.floorSurface);
      floorMesh.position.y = -0.005;
      floorMesh.receiveShadow = true;
      floorMesh.visible =
        configRef.current.sceneId !== 'kahf-sanctuary' &&
        configRef.current.sceneId !== 'rover';
      scene.add(floorMesh);

      // Build initial 3D scene
      const activeScene = buildSceneById(configRef.current.sceneId, {
        materials,
        textures,
        isSoftwareGl,
      });
      scene.add(activeScene.group);

      // Post-processing composer (GPU only): Depth-of-Field Bokeh blur + Bloom + Output
      let composer: EffectComposer | null = null;
      let bokehPass: BokehPass | null = null;
      let bloomPass: UnrealBloomPass | null = null;
      if (!isSoftwareGl) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bokehPass = new BokehPass(scene, camera, {
          focus: 6.0,
          aperture: 0.00028,
          maxblur: 0.0045,
        });
        composer.addPass(bokehPass);
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.36,
          0.55,
          0.88,
        );
        bloomPass.enabled = configRef.current.bloomEnabled;
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
        renderer.compile(scene, camera);
      }

      const audio = new VoiceoverAudioEngine({
        onDurationLoaded: (dur) => callbacksRef.current.onVoDurationLoaded(dur),
        onAutoplayBlocked: (blocked) => callbacksRef.current.onAutoplayBlocked(blocked),
      });
      if (voUrl) {
        audio.loadSource(voUrl);
      }

      const rt = runtimeRef.current;
      rt.renderer = renderer;
      rt.scene = scene;
      rt.camera = camera;
      rt.controls = controls;
      rt.composer = composer;
      rt.bokehPass = bokehPass;
      rt.bloomPass = bloomPass;
      rt.audio = audio;
      rt.activeScene = activeScene;
      rt.activeSceneId = configRef.current.sceneId;
      rt.materials = materials;
      rt.textures = textures;
      rt.keyLight = keyLight;
      rt.hemiLight = hemiLight;
      rt.rimLight = rimLight;
      rt.softLeftLight = softLeftLight;
      rt.softTopLight = softTopLight;
      rt.floorMesh = floorMesh;
      rt.isSoftwareGl = isSoftwareGl;

      const renderFrame = () => {
        if (composer && !isSoftwareGl) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      };
      rt.renderNow = renderFrame;

      // Handle viewport resize cleanly
      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) {
          composer.setSize(w, h);
        }
        if (bokehPass) {
          bokehPass.setSize(w, h);
        }
        if (bloomPass) {
          bloomPass.resolution.set(w, h);
        }
      };
      window.addEventListener('resize', handleResize);

      // Camera choreography evaluator (calm, wide panoramic shots + motivated 3-point lighting across 0-60s)
      const _skyNight = new THREE.Color(0x18243c);
      const _skyDawn = new THREE.Color(0x614939);
      const _skyDay = new THREE.Color(0x7692a6);
      const _skySanctuary = new THREE.Color(0x28211b);
      const _skyPlaza = new THREE.Color(0x2f1c18);
      const _skyTree = new THREE.Color(0x263956);
      const _skyMarket = new THREE.Color(0x7c97ab);
      const _skyBlend = new THREE.Color();
      const _keyNight = new THREE.Color(0xc8ddff);
      const _keyDawn = new THREE.Color(0xffcc8c);
      const _keySilver = new THREE.Color(0xf1f5f9);
      const _keyTorch = new THREE.Color(0xffb469);
      const _keySun = new THREE.Color(0xfff1d6);
      const _rimWarm = new THREE.Color(0xffa952);
      const _rimCool = new THREE.Color(0x88b4f7);

      const updateCameraChoreography = (
        t: number,
        dur: number,
        dt: number,
        shot: StudioConfig['cameraShot'],
        sceneId: ScenePresetId,
      ) => {
        // Dynamic soft 3-point key + rim + sky fill placed purposefully across full 0 - 527s story
        if (sceneId === 'kahf-sanctuary' && shot === 'kahf-story') {
          let fogDensityTarget = 0.01;
          let envIntensityTarget = 1.0;
          let softLeftIntensityTarget = 1.8;
          let softTopIntensityTarget = 1.4;

          if (t < 3.85) {
            // Deep Dark Cave Night Intro: moonlight grazes outer mountain ridge while cave interior stays dark
            _skyBlend.copy(_skyNight);
            keyLight.color.copy(_keyNight);
            keyLight.intensity = 1.58;
            keyLight.position.set(8.5, 11.8, 2.0);
            rimLight.color.copy(_rimCool);
            rimLight.intensity = 0.85;
            rimLight.position.set(-7.5, 6.0, -5.0);
            hemiLight.intensity = 0.34;
            envIntensityTarget = 0.28;
            softLeftIntensityTarget = 0.12;
            softTopIntensityTarget = 0.08;
            fogDensityTarget = 0.011;
          } else if (t < 7.4) {
            // Dawn gently reaches cave mouth while inner recess stays deep and sheltered
            const p = THREE.MathUtils.smoothstep(t, 3.85, 5.4);
            _skyBlend.copy(_skyNight).lerp(_skyDawn, p);
            keyLight.color.copy(_keyNight).lerp(_keyDawn, p);
            keyLight.intensity = THREE.MathUtils.lerp(1.58, 2.25, p);
            keyLight.position.set(
              THREE.MathUtils.lerp(8.5, 7.6, p),
              THREE.MathUtils.lerp(11.6, 8.2, p),
              THREE.MathUtils.lerp(2.2, 6.4, p),
            );
            rimLight.color.copy(_rimCool).lerp(_rimWarm, p);
            rimLight.intensity = 1.05;
            rimLight.position.set(-7.5, 5.5, -5.0);
            hemiLight.intensity = THREE.MathUtils.lerp(0.36, 0.58, p);
            envIntensityTarget = THREE.MathUtils.lerp(0.3, 0.52, p);
            softLeftIntensityTarget = THREE.MathUtils.lerp(0.14, 0.36, p);
            softTopIntensityTarget = THREE.MathUtils.lerp(0.1, 0.28, p);
            fogDensityTarget = 0.01;
          } else if (t < 12.0) {
            const sunTheta = (t - 7.4) * ((Math.PI * 2 * 2) / 4.6) + 0.35;
            const sunSin = Math.sin(sunTheta);
            const dayFactor = THREE.MathUtils.smoothstep(sunSin, -0.18, 0.36);
            _skyBlend
              .copy(_skyNight)
              .lerp(_skyDawn, Math.min(1, dayFactor * 1.35))
              .lerp(_skyDay, THREE.MathUtils.smoothstep(sunSin, 0.25, 0.88));
            keyLight.color
              .copy(_keyNight)
              .lerp(_keyDawn, dayFactor)
              .lerp(_keySun, THREE.MathUtils.smoothstep(sunSin, 0.35, 0.9));
            keyLight.intensity = THREE.MathUtils.lerp(1.85, 2.95, dayFactor);
            keyLight.position.set(
              -Math.cos(sunTheta) * 11.5,
              4.0 + Math.max(0, sunSin) * 7.5,
              10.0,
            );
            rimLight.color.copy(_rimCool).lerp(_rimWarm, dayFactor * 0.5);
            rimLight.intensity = 1.15;
            rimLight.position.set(-9.0, 6.0, -7.0);
            hemiLight.intensity = THREE.MathUtils.lerp(0.48, 1.05, dayFactor);
            envIntensityTarget = THREE.MathUtils.lerp(0.42, 0.82, dayFactor);
            softLeftIntensityTarget = THREE.MathUtils.lerp(0.24, 0.88, dayFactor);
            softTopIntensityTarget = THREE.MathUtils.lerp(0.18, 0.68, dayFactor);
            fogDensityTarget = 0.0095;
          } else if (t < 27.5) {
            // Stage 2 Intro: Quran Rehal & Silver Coin
            _skyBlend.copy(_skySanctuary);
            keyLight.color.copy(t < 17.05 ? _keyDawn : _keySilver);
            keyLight.intensity = t < 17.05 ? 2.25 : 2.55;
            keyLight.position.set(t < 17.05 ? -5.0 : 5.5, 6.6, 6.2);
            rimLight.color.copy(t < 17.05 ? _rimCool : _rimWarm);
            rimLight.intensity = 1.55;
            rimLight.position.set(6.0, 4.8, -6.0);
            hemiLight.intensity = 1.32;
            fogDensityTarget = 0.01;
          } else if (t < 47.3) {
            // Stage 3 Intro: Torchlit Plaza
            _skyBlend.copy(_skyPlaza);
            keyLight.color.copy(_keyTorch);
            keyLight.intensity = 2.2;
            keyLight.position.set(9.5, 8.2, 3.5);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.75;
            rimLight.position.set(-8.5, 5.5, -10.5);
            hemiLight.intensity = 1.12;
            softLeftIntensityTarget = 1.15;
            softTopIntensityTarget = 0.9;
            fogDensityTarget = 0.01;
          } else if (t < 91.7) {
            // Shade Tree Dialogue & Hidayah
            const hidayahP = THREE.MathUtils.smoothstep(t, 74.0, 82.0);
            _skyBlend.copy(_skyTree).lerp(_skyDawn, hidayahP * 0.35);
            keyLight.color.copy(_keyNight).lerp(_keyDawn, hidayahP * 0.7);
            keyLight.intensity = 2.35 + hidayahP * 0.3;
            keyLight.position.set(-10.5, 4.6, 8.5);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.65;
            rimLight.position.set(8.5, 4.8, -8.5);
            hemiLight.intensity = 1.32;
            fogDensityTarget = 0.009;
          } else if (t < 133.8) {
            // Royal Court Trial before Tyrant King
            _skyBlend.copy(_skyPlaza);
            keyLight.color.copy(_keyTorch);
            keyLight.intensity = 2.35;
            keyLight.position.set(9.2, 8.0, 4.5);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.85;
            rimLight.position.set(-8.5, 5.5, -10.0);
            hemiLight.intensity = 1.18;
            softLeftIntensityTarget = 1.15;
            softTopIntensityTarget = 0.9;
            fogDensityTarget = 0.01;
          } else if (t < 184.5) {
            // Cave Approach, Du'a & Peaceful Veil of Sleep (cavern stays progressively darker inside)
            const enterCave = THREE.MathUtils.smoothstep(t, 144.0, 159.0);
            const sleepVeil = THREE.MathUtils.smoothstep(t, 174.0, 183.5);
            const duaGlow =
              t >= 160.0 && t < 174.0
                ? THREE.MathUtils.smoothstep(t, 160.0, 164.0) * 0.28
                : 0;
            _skyBlend.copy(_skyNight).lerp(_skySanctuary, duaGlow);
            keyLight.color.copy(_keyNight).lerp(_keyDawn, duaGlow);
            keyLight.intensity =
              THREE.MathUtils.lerp(2.05, 1.52, enterCave) +
              duaGlow * 0.45 -
              sleepVeil * 0.25;
            keyLight.position.set(
              THREE.MathUtils.lerp(5.5, 8.8, enterCave),
              THREE.MathUtils.lerp(5.8, 11.8, enterCave),
              THREE.MathUtils.lerp(10.0, 2.0, enterCave),
            );
            rimLight.color.copy(_rimCool);
            rimLight.intensity = THREE.MathUtils.lerp(1.25, 0.85, enterCave);
            rimLight.position.set(-7.5, 6.0, -5.0);
            hemiLight.intensity =
              THREE.MathUtils.lerp(0.88, 0.34, enterCave) +
              duaGlow * 0.14 -
              sleepVeil * 0.06;
            envIntensityTarget =
              THREE.MathUtils.lerp(0.75, 0.28, enterCave) - sleepVeil * 0.04;
            softLeftIntensityTarget = THREE.MathUtils.lerp(0.82, 0.12, enterCave);
            softTopIntensityTarget = THREE.MathUtils.lerp(0.62, 0.08, enterCave);
            fogDensityTarget = 0.01;
          } else if (t < 198.5) {
            // Sun rises on RIGHT (+X) & sets on LEFT (-X) of cave ridge while interior remains shaded
            const pSun = (t - 184.5) / 14.0;
            const arcAng = THREE.MathUtils.lerp(0.18, Math.PI - 0.18, pSun);
            const sunSin = Math.sin(arcAng);
            _skyBlend.copy(_skyDawn).lerp(_skyDay, sunSin * 0.72);
            keyLight.color.copy(_keyDawn).lerp(_keySun, sunSin * 0.5);
            keyLight.intensity = 2.45 + sunSin * 0.4;
            keyLight.position.set(Math.cos(arcAng) * 11.5, 6.8 + sunSin * 5.2, 1.6);
            rimLight.color.copy(_rimCool);
            rimLight.intensity = 1.1;
            rimLight.position.set(0, 6.0, -7.0);
            hemiLight.intensity = 0.62;
            envIntensityTarget = 0.48;
            softLeftIntensityTarget = 0.38;
            softTopIntensityTarget = 0.28;
            fogDensityTarget = 0.009;
          } else if (t < 231.5) {
            // Turning sides, Intruder flee, Centuries timelapse
            const inLap = t >= 220.5;
            if (inLap) {
              const sunTheta = (t - 220.5) * ((Math.PI * 2 * 3.5) / 11.0) + 0.4;
              const sunSin = Math.sin(sunTheta);
              const dayFactor = THREE.MathUtils.smoothstep(sunSin, -0.18, 0.36);
              _skyBlend
                .copy(_skyNight)
                .lerp(_skyDawn, Math.min(1, dayFactor * 1.35))
                .lerp(_skyDay, THREE.MathUtils.smoothstep(sunSin, 0.25, 0.88));
              keyLight.color
                .copy(_keyNight)
                .lerp(_keyDawn, dayFactor)
                .lerp(_keySun, THREE.MathUtils.smoothstep(sunSin, 0.35, 0.9));
              keyLight.intensity = THREE.MathUtils.lerp(1.85, 2.85, dayFactor);
              keyLight.position.set(
                -Math.cos(sunTheta) * 11.5,
                4.2 + Math.max(0, sunSin) * 7.2,
                10.0,
              );
              rimLight.color.copy(_rimCool).lerp(_rimWarm, dayFactor * 0.5);
              rimLight.intensity = 1.15;
              hemiLight.intensity = THREE.MathUtils.lerp(0.46, 1.02, dayFactor);
              envIntensityTarget = THREE.MathUtils.lerp(0.42, 0.82, dayFactor);
              softLeftIntensityTarget = THREE.MathUtils.lerp(0.24, 0.88, dayFactor);
              softTopIntensityTarget = THREE.MathUtils.lerp(0.18, 0.68, dayFactor);
            } else {
              _skyBlend.copy(_skyNight);
              keyLight.color.copy(_keyNight);
              keyLight.intensity = 1.5;
              keyLight.position.set(8.5, 11.4, 2.4);
              rimLight.color.copy(_rimCool);
              rimLight.intensity = 0.88;
              hemiLight.intensity = 0.36;
              envIntensityTarget = 0.3;
              softLeftIntensityTarget = 0.14;
              softTopIntensityTarget = 0.1;
            }
            fogDensityTarget = 0.0095;
          } else if (t < 286.8) {
            // Afternoon Awakening, Cave-Mouth Coin Dispatch & Canyon Trail Descent toward City
            const wakeOut = THREE.MathUtils.smoothstep(t, 231.5, 240.0);
            const descentBlend = THREE.MathUtils.smoothstep(t, 266.0, 276.0);
            _skyBlend.copy(_skyDawn).lerp(_skyDay, descentBlend * 0.35);
            keyLight.color.copy(_keyDawn).lerp(_keySun, descentBlend * 0.45);
            keyLight.intensity = THREE.MathUtils.lerp(2.1, 2.65, wakeOut);
            keyLight.position.set(7.5, 6.8, THREE.MathUtils.lerp(4.0, 8.5, wakeOut));
            rimLight.color.copy(_rimCool);
            rimLight.intensity = 1.25;
            hemiLight.intensity = THREE.MathUtils.lerp(0.62, 1.25, wakeOut);
            envIntensityTarget = THREE.MathUtils.lerp(0.48, 0.92, wakeOut);
            softLeftIntensityTarget = THREE.MathUtils.lerp(0.45, 1.35, wakeOut);
            softTopIntensityTarget = THREE.MathUtils.lerp(0.35, 1.05, wakeOut);
            fogDensityTarget = 0.0085;
          } else if (t < 329.5) {
            // Stage 5: Bright Sunlit Marketplace & Righteous Believer City
            _skyBlend.copy(_skyMarket);
            keyLight.color.copy(_keySun);
            keyLight.intensity = 2.65;
            keyLight.position.set(8.5, 9.5, 7.5);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.3;
            rimLight.position.set(-8.0, 6.0, -8.5);
            hemiLight.intensity = 1.42;
            fogDensityTarget = 0.0075;
          } else if (t < 384.5) {
            // Resurrection Promise -> Memorial Mosque Dusk -> 3/5/7 Formation
            const inMosq = t >= 347.0;
            _skyBlend.copy(inMosq ? _skyTree : _skyDawn);
            keyLight.color.copy(inMosq ? _keyDawn : _keySun);
            keyLight.intensity = inMosq ? 2.35 : 2.7;
            keyLight.position.set(-6.5, 7.2, 9.5);
            rimLight.color.copy(inMosq ? _rimWarm : _rimCool);
            rimLight.intensity = 1.55;
            hemiLight.intensity = inMosq ? 0.95 : 1.28;
            envIntensityTarget = inMosq ? 0.72 : 0.95;
            softLeftIntensityTarget = inMosq ? 0.85 : 1.5;
            softTopIntensityTarget = inMosq ? 0.65 : 1.15;
            fogDensityTarget = 0.009;
          } else if (t < 423.0) {
            // Quran Rehal (384.5-404) & Solar/Lunar 300/309 Orbit (404-423)
            _skyBlend.copy(t < 404.0 ? _skySanctuary : _skyNight);
            keyLight.color.copy(_keyDawn);
            keyLight.intensity = 2.35;
            keyLight.position.set(-5.0, 7.0, 7.0);
            rimLight.color.copy(_rimCool);
            rimLight.intensity = 1.5;
            hemiLight.intensity = 1.32;
            fogDensityTarget = 0.0095;
          } else if (t < 446.5) {
            // Lesson 1 & Lesson 2 under Shade Tree
            const p = THREE.MathUtils.smoothstep(t, 433.0, 442.0);
            _skyBlend.copy(_skyTree).lerp(_skyDawn, p * 0.55);
            keyLight.color.copy(_keyNight).lerp(_keyDawn, p);
            keyLight.intensity = 2.45;
            keyLight.position.set(-9.5, 5.2, 9.0);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.6;
            hemiLight.intensity = 1.35;
            fogDensityTarget = 0.009;
          } else if (t < 492.0) {
            // Lesson 3 & Lesson 4: Illuminated Quran Rehal
            _skyBlend.copy(_skySanctuary);
            keyLight.color.copy(_keyDawn);
            keyLight.intensity = 2.3;
            keyLight.position.set(-5.0, 6.5, 6.5);
            rimLight.color.copy(_rimCool);
            rimLight.intensity = 1.5;
            hemiLight.intensity = 1.35;
            fogDensityTarget = 0.0095;
          } else {
            // Closing Outro Reflection & Dawn Horizon Fade
            const p = THREE.MathUtils.smoothstep(t, 512.0, 526.0);
            _skyBlend.copy(_skyTree).lerp(_skyDawn, p * 0.85);
            keyLight.color.copy(_keyNight).lerp(_keyDawn, p);
            keyLight.intensity = THREE.MathUtils.lerp(2.3, 2.75, p);
            keyLight.position.set(-10.0, 5.2, 8.8);
            rimLight.color.copy(_rimWarm);
            rimLight.intensity = 1.65;
            hemiLight.intensity = 1.35;
            fogDensityTarget = 0.0088;
          }

          scene.environmentIntensity = envIntensityTarget;
          if (softLeftLight) softLeftLight.intensity = softLeftIntensityTarget;
          if (softTopLight) softTopLight.intensity = softTopIntensityTarget;

          if (scene.background instanceof THREE.Color) {
            scene.background.copy(_skyBlend);
          }
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.copy(_skyBlend);
            scene.fog.density = fogDensityTarget;
          }
          hemiLight.color.copy(keyLight.color).lerp(_skyBlend, 0.45);
          const timelapseIsDay =
            t >= 7.4 && t < 12.0
              ? Math.sin((t - 7.4) * ((Math.PI * 2 * 2) / 4.6) + 0.35) > 0
              : t >= 220.5 && t < 231.5
                ? Math.sin((t - 220.5) * ((Math.PI * 2 * 3.5) / 11.0) + 0.4) > 0
                : true;
          hemiLight.groundColor.setHex(
            ((t >= 3.85 && t < 12.0) ||
              (t >= 184.5 && t < 198.5) ||
              (t >= 220.5 && t < 347.0)) &&
              timelapseIsDay
              ? 0x6e5842
              : 0x2b2932,
          );
        } else {
          scene.environmentIntensity = 1.0;
          if (softLeftLight) softLeftLight.intensity = 1.8;
          if (softTopLight) softTopLight.intensity = 1.4;
        }

        if (shot === 'free-orbit') {
          if (Math.abs(camera.fov - 52) > 0.1) {
            camera.fov = THREE.MathUtils.damp(camera.fov, 52, 6, dt);
            camera.updateProjectionMatrix();
          }
          controls.update();
          if (bokehPass) {
            (bokehPass.uniforms as { focus: THREE.IUniform<number> }).focus.value =
              camera.position.distanceTo(controls.target);
          }
          return;
        }
        const meta =
          SCENE_PRESETS.find((s) => s.id === sceneId) ?? SCENE_PRESETS[0];
        const phase = dur > 0 ? (t / dur) * Math.PI * 2 : t;
        const u = dur > 0 ? Math.min(1, Math.max(0, t / dur)) : 0;
        const r = meta.defaultRadius;

        _desiredTarget.set(
          meta.defaultTarget[0],
          meta.defaultTarget[1],
          meta.defaultTarget[2],
        );

        let desiredFov = 52;

        if (shot === 'kahf-story') {
          let bokehFocus = 5.5;
          if (t < 1.35) {
            const p = THREE.MathUtils.smoothstep(t, 0, 1.35);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.85, -2.25, p),
              THREE.MathUtils.lerp(2.4, 2.15, p),
              THREE.MathUtils.lerp(8.9, 7.85, p),
            );
            _desiredTarget.set(0, 1.55, 1.6);
            desiredFov = 60;
            bokehFocus = 6.0;
          } else if (t < 3.85) {
            const p = THREE.MathUtils.smoothstep(t, 1.35, 3.85);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(1.7, 1.38, p),
              THREE.MathUtils.lerp(1.52, 1.38, p),
              THREE.MathUtils.lerp(2.35, 1.9, p),
            );
            _desiredTarget.set(0.0, 0.72, -1.2);
            desiredFov = 54;
            bokehFocus = 3.5;
          } else if (t < 7.4) {
            const p = THREE.MathUtils.smoothstep(t, 3.85, 7.4);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.95, -2.25, p),
              THREE.MathUtils.lerp(1.68, 1.88, p),
              THREE.MathUtils.lerp(3.15, 4.45, p),
            );
            _desiredTarget.set(0.0, 1.25, -0.5);
            desiredFov = 58;
            bokehFocus = 4.6;
          } else if (t < 12.0) {
            const p = THREE.MathUtils.smoothstep(t, 7.4, 10.6);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.15, 2.65, p),
              THREE.MathUtils.lerp(2.38, 2.68, p),
              THREE.MathUtils.lerp(0.55, 1.95, p),
            );
            _desiredTarget.set(-0.15, 1.55, 9.2);
            desiredFov = 64;
            bokehFocus = 3.8;
          } else if (t < 14.35) {
            const p = THREE.MathUtils.smoothstep(t, 12.0, 14.35);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.45, 1.85, p),
              THREE.MathUtils.lerp(2.38, 2.15, p),
              THREE.MathUtils.lerp(6.4, 5.4, p),
            );
            _desiredTarget.set(0.0, 1.35, -1.2);
            desiredFov = 62;
            bokehFocus = 6.2;
          } else if (t < 17.05) {
            const p = THREE.MathUtils.smoothstep(t, 14.35, 17.05);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(0.85, 0.35, p),
              THREE.MathUtils.lerp(1.58, 1.44, p),
              THREE.MathUtils.lerp(2.9, 2.35, p),
            );
            _desiredTarget.set(0.0, 1.04, 0.0);
            desiredFov = 46;
            bokehFocus = 2.6;
          } else if (t < 20.8) {
            const p = THREE.MathUtils.smoothstep(t, 17.05, 20.8);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.1, -1.55, p),
              THREE.MathUtils.lerp(2.15, 1.92, p),
              THREE.MathUtils.lerp(5.6, 4.7, p),
            );
            _desiredTarget.set(0.0, 1.28, -0.8);
            desiredFov = 58;
            bokehFocus = 5.0;
          } else if (t < 27.5) {
            const p = THREE.MathUtils.smoothstep(t, 20.8, 27.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(0.55, 0.15, p),
              THREE.MathUtils.lerp(1.42, 1.32, p),
              THREE.MathUtils.lerp(2.35, 1.95, p),
            );
            _desiredTarget.set(0.0, 1.12, -0.1);
            desiredFov = 44;
            bokehFocus = 2.2;
          } else if (t < 36.8) {
            const p = THREE.MathUtils.smoothstep(t, 27.5, 36.8);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(4.45, 3.4, p),
              THREE.MathUtils.lerp(3.35, 3.05, p),
              THREE.MathUtils.lerp(4.65, 3.8, p),
            );
            _desiredTarget.set(0.0, 1.5, -5.0);
            desiredFov = 62;
            bokehFocus = 8.5;
          } else if (t < 47.3) {
            const p = THREE.MathUtils.smoothstep(t, 36.8, 47.3);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-4.2, -3.6, p),
              THREE.MathUtils.lerp(2.1, 2.15, p),
              THREE.MathUtils.lerp(5.45, 4.8, p),
            );
            _desiredTarget.set(0.1, 1.4, -1.2);
            desiredFov = 58;
            bokehFocus = 5.0;
          } else if (t < 54.9) {
            const p = THREE.MathUtils.smoothstep(t, 47.3, 54.9);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(4.8, 4.1, p),
              THREE.MathUtils.lerp(3.1, 2.8, p),
              THREE.MathUtils.lerp(2.4, 4.8, p),
            );
            _desiredTarget.set(-0.1, 1.15, -2.5);
            desiredFov = 62;
            bokehFocus = 6.8;
          } else if (t < 62.0) {
            const p = THREE.MathUtils.smoothstep(t, 54.9, 62.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(3.15, 2.15, p),
              THREE.MathUtils.lerp(2.5, 2.28, p),
              THREE.MathUtils.lerp(8.4, 7.6, p),
            );
            _desiredTarget.set(0.0, 1.75, 0.8);
            desiredFov = 64;
            bokehFocus = 6.5;
          } else if (t < 74.8) {
            // Chapter 5A (62 - 74.8s): Closer respectful 3-shot under shade tree ("Our Lord is One. Allah.")
            const p = THREE.MathUtils.smoothstep(t, 62.0, 74.8);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.45, 1.25, p),
              THREE.MathUtils.lerp(1.52, 1.42, p),
              THREE.MathUtils.lerp(5.55, 5.1, p),
            );
            _desiredTarget.set(0.0, 1.05, 1.75);
            desiredFov = 48;
            bokehFocus = 4.2;
          } else if (t < 91.7) {
            // Chapter 5B (74.8 - 91.7s): Wide scenic hilltop framing youths + canopy + Hidayah ray
            const p = THREE.MathUtils.smoothstep(t, 74.8, 91.7);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.4, -2.2, p),
              THREE.MathUtils.lerp(2.2, 2.45, p),
              THREE.MathUtils.lerp(7.9, 8.6, p),
            );
            _desiredTarget.set(0.0, 1.95, 0.9);
            desiredFov = 62;
            bokehFocus = 7.5;
          } else if (t < 112.0) {
            // Chapter 6A (91.7 - 112s): Wide royal court framing king/guards/crowd & 3 upright youths
            const p = THREE.MathUtils.smoothstep(t, 91.7, 112.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-4.6, -3.5, p),
              THREE.MathUtils.lerp(2.45, 2.15, p),
              THREE.MathUtils.lerp(5.8, 4.9, p),
            );
            _desiredTarget.set(-0.2, 1.35, -0.8);
            desiredFov = 60;
            bokehFocus = 5.8;
          } else if (t < 133.8) {
            // Chapter 6B (112 - 133.8s): Dramatic cross-court medium-wide on steadfast youths & king's ultimatum
            const p = THREE.MathUtils.smoothstep(t, 112.0, 133.8);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(3.6, 2.8, p),
              THREE.MathUtils.lerp(2.15, 2.35, p),
              THREE.MathUtils.lerp(4.4, 5.1, p),
            );
            _desiredTarget.set(-0.1, 1.38, -0.4);
            desiredFov = 54;
            bokehFocus = 5.2;
          } else if (t < 144.0) {
            // Chapter 7A (133.8 - 144s): Mountain ridge overlook consultation
            const p = THREE.MathUtils.smoothstep(t, 133.8, 144.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.6, 1.85, p),
              THREE.MathUtils.lerp(2.2, 1.95, p),
              THREE.MathUtils.lerp(9.2, 8.4, p),
            );
            _desiredTarget.set(0.0, 1.35, 2.6);
            desiredFov = 62;
            bokehFocus = 5.2;
          } else if (t < 160.0) {
            // Chapter 7B (144 - 160s): Wide cliffside view tracking youths walking into the cave arch
            const p = THREE.MathUtils.smoothstep(t, 144.0, 160.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-3.2, -1.9, p),
              THREE.MathUtils.lerp(2.4, 1.85, p),
              THREE.MathUtils.lerp(7.6, 4.2, p),
            );
            _desiredTarget.set(0.0, 1.4, -0.4);
            desiredFov = 58;
            bokehFocus = 5.2;
          } else if (t < 174.0) {
            // Chapter 8A (160 - 174s): Intimate cave arch framing raised hands in Du'a
            const p = THREE.MathUtils.smoothstep(t, 160.0, 174.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(1.55, -1.25, p),
              THREE.MathUtils.lerp(1.45, 1.55, p),
              THREE.MathUtils.lerp(2.55, 2.35, p),
            );
            _desiredTarget.set(0.0, 1.05, -1.15);
            desiredFov = 50;
            bokehFocus = 3.6;
          } else if (t < 184.5) {
            // Chapter 8B (174 - 184.5s): Soft pull-back as veil of peaceful sleep settles
            const p = THREE.MathUtils.smoothstep(t, 174.0, 184.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.4, -2.0, p),
              THREE.MathUtils.lerp(1.45, 1.75, p),
              THREE.MathUtils.lerp(2.1, 3.6, p),
            );
            _desiredTarget.set(0.0, 0.78, -1.1);
            desiredFov = 56;
            bokehFocus = 3.8;
          } else if (t < 198.5) {
            // Chapter 9A (184.5 - 198.5s): Wide cave mouth view framing sleepers below and sun rising right / setting left above ridge
            const p = THREE.MathUtils.smoothstep(t, 184.5, 198.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(0.35, -0.35, p),
              THREE.MathUtils.lerp(2.45, 2.38, p),
              THREE.MathUtils.lerp(8.4, 8.6, p),
            );
            _desiredTarget.set(0.0, 2.35, 0.0);
            desiredFov = 64;
            bokehFocus = 8.4;
          } else if (t < 210.7) {
            // Chapter 9B (198.5 - 210.7s): Medium-wide cave threshold framing turning sleepers & Qitmir with paws extended
            const p = THREE.MathUtils.smoothstep(t, 198.5, 210.7);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.1, 1.65, p),
              THREE.MathUtils.lerp(1.32, 1.18, p),
              THREE.MathUtils.lerp(3.6, 3.05, p),
            );
            _desiredTarget.set(0.25, 0.65, -0.4);
            desiredFov = 52;
            bokehFocus = 3.4;
          } else if (t < 220.5) {
            // Chapter 9C (210.7 - 220.5s): Wide trail flank watching intruder approach & flee in awe
            const p = THREE.MathUtils.smoothstep(t, 210.7, 220.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-3.4, -3.8, p),
              THREE.MathUtils.lerp(2.15, 2.35, p),
              THREE.MathUtils.lerp(5.8, 7.2, p),
            );
            _desiredTarget.set(0.0, 1.15, 1.6);
            desiredFov = 60;
            bokehFocus = 5.4;
          } else if (t < 231.5) {
            // Chapter 9D (220.5 - 231.5s): Grand valley timelapse as centuries pass outside
            const p = THREE.MathUtils.smoothstep(t, 220.5, 231.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.2, 2.9, p),
              THREE.MathUtils.lerp(2.5, 2.8, p),
              THREE.MathUtils.lerp(-0.3, 1.6, p),
            );
            _desiredTarget.set(0.0, 1.65, 9.0);
            desiredFov = 64;
            bokehFocus = 5.0;
          } else if (t < 257.0) {
            // Chapter 10A (231.5 - 257s): Afternoon awakening & quiet debate at warm sunlit cave threshold
            const p = THREE.MathUtils.smoothstep(t, 231.5, 257.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.95, 1.85, p),
              THREE.MathUtils.lerp(1.75, 1.68, p),
              THREE.MathUtils.lerp(4.6, 4.1, p),
            );
            _desiredTarget.set(0.0, 1.18, -0.35);
            desiredFov = 56;
            bokehFocus = 4.8;
          } else if (t < 266.0) {
            // Chapter 10B (257 - 266s / 4.3 - 4.4 min): Entrusting silver coin & woven pouch at natural cave opening
            const p = THREE.MathUtils.smoothstep(t, 257.0, 266.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(1.45, -1.25, p),
              THREE.MathUtils.lerp(1.52, 1.48, p),
              THREE.MathUtils.lerp(2.85, 2.55, p),
            );
            _desiredTarget.set(0.05, 1.24, 0.12);
            desiredFov = 46;
            bokehFocus = 2.75;
          } else if (t < 286.8) {
            // Chapter 10C (266 - 286.8s / ~4.4 min): Cautious canyon-trail descent toward distant walled valley city
            const walk = THREE.MathUtils.smoothstep(t, 266.0, 286.8);
            const lz = THREE.MathUtils.lerp(1.25, 11.4, walk);
            const lx = lz <= 1.2 ? 0 : Math.sin((lz - 1.2) * 0.34) * 1.15;
            const orbitSwap = THREE.MathUtils.smoothstep(t, 272.5, 278.5);
            // Smoothly sweeps from cautious 3/4 front-trail framing to over-shoulder vista facing the walled city ahead
            const camX = lx + THREE.MathUtils.lerp(-1.95, -2.05, orbitSwap);
            const camY = THREE.MathUtils.lerp(1.85, 2.35, orbitSwap);
            const camZ = lz + THREE.MathUtils.lerp(3.25, -2.75, orbitSwap);
            _desiredCamPos.set(camX, camY, camZ);
            _desiredTarget.set(
              THREE.MathUtils.lerp(lx, lx * 0.35, orbitSwap),
              THREE.MathUtils.lerp(1.25, 1.05, orbitSwap),
              lz + THREE.MathUtils.lerp(-0.4, 8.8, orbitSwap),
            );
            desiredFov = THREE.MathUtils.lerp(54, 62, orbitSwap);
            bokehFocus = THREE.MathUtils.lerp(3.8, 5.2, orbitSwap);
          } else if (t < 294.2) {
            // Chapter 11A (286.8 - 294.2s): Wide sunlit marketplace street as youth marvels at new city
            const p = THREE.MathUtils.smoothstep(t, 286.8, 294.2);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.6, -2.1, p),
              THREE.MathUtils.lerp(2.35, 2.15, p),
              THREE.MathUtils.lerp(8.2, 5.2, p),
            );
            _desiredTarget.set(0.3, 1.45, 0.2);
            desiredFov = 62;
            bokehFocus = 6.2;
          } else if (t < 305.5) {
            // Chapter 11B (294.2 - 305.5s): Food stall coin exchange & shocked baker
            const p = THREE.MathUtils.smoothstep(t, 294.2, 305.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-0.95, -0.45, p),
              THREE.MathUtils.lerp(1.75, 1.62, p),
              THREE.MathUtils.lerp(3.85, 3.25, p),
            );
            _desiredTarget.set(1.85, 1.15, 0.6);
            desiredFov = 48;
            bokehFocus = 3.6;
          } else if (t < 314.8) {
            // Chapter 11C (305.5 - 314.8s): Wide crowd escorting youth toward righteous ruler
            const p = THREE.MathUtils.smoothstep(t, 305.5, 314.8);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-3.2, -2.5, p),
              THREE.MathUtils.lerp(2.55, 2.35, p),
              THREE.MathUtils.lerp(3.2, 0.6, p),
            );
            _desiredTarget.set(0.0, 1.45, -4.8);
            desiredFov = 60;
            bokehFocus = 6.2;
          } else if (t < 329.5) {
            // Chapter 11D (314.8 - 329.5s): Clear wide plaza framing righteous ruler, mosque dome & believing city
            const p = THREE.MathUtils.smoothstep(t, 314.8, 329.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.1, -1.3, p),
              THREE.MathUtils.lerp(2.2, 2.45, p),
              THREE.MathUtils.lerp(0.2, 1.2, p),
            );
            _desiredTarget.set(0.0, 1.85, -7.2);
            desiredFov = 62;
            bokehFocus = 6.8;
          } else if (t < 347.0) {
            // Chapter 12A (329.5 - 347s): Golden promise of Resurrection at sunlit cave sanctuary
            const p = THREE.MathUtils.smoothstep(t, 329.5, 347.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.5, 2.3, p),
              THREE.MathUtils.lerp(2.15, 2.35, p),
              THREE.MathUtils.lerp(6.8, 7.5, p),
            );
            _desiredTarget.set(0.0, 1.55, 0.4);
            desiredFov = 60;
            bokehFocus = 6.5;
          } else if (t < 363.0) {
            // Chapter 12B (347 - 363s): High unobstructed crane reveal of Memorial Mosque atop cave ridge
            const p = THREE.MathUtils.smoothstep(t, 347.0, 363.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(4.4, 2.6, p),
              THREE.MathUtils.lerp(5.6, 6.4, p),
              THREE.MathUtils.lerp(9.8, 10.8, p),
            );
            _desiredTarget.set(0.0, 5.8, -2.2);
            desiredFov = 62;
            bokehFocus = 12.6;
          } else if (t < 384.5) {
            // Chapter 13A (363 - 384.5s): Wide silhouette reveal of 3+1, 5+1, 7+1 companions & Qitmir
            const p = THREE.MathUtils.smoothstep(t, 363.0, 384.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.4, 1.4, p),
              THREE.MathUtils.lerp(1.95, 2.15, p),
              THREE.MathUtils.lerp(7.8, 8.6, p),
            );
            _desiredTarget.set(0.0, 1.35, 1.2);
            desiredFov = 60;
            bokehFocus = 7.0;
          } else if (t < 404.0) {
            // Chapter 13B (384.5 - 404s): Quran Rehal in soft sanctuary light ("My Lord knows best their number")
            const p = THREE.MathUtils.smoothstep(t, 384.5, 404.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.2, 0.45, p),
              THREE.MathUtils.lerp(2.1, 1.56, p),
              THREE.MathUtils.lerp(5.8, 2.6, p),
            );
            _desiredTarget.set(0.0, 1.12, 0.0);
            desiredFov = THREE.MathUtils.lerp(60, 46, p);
            bokehFocus = THREE.MathUtils.lerp(5.8, 2.6, p);
          } else if (t < 423.0) {
            // Chapter 13C (404 - 423s): Grand wide celestial shot cleanly framing 300/309 concentric orbits
            const p = THREE.MathUtils.smoothstep(t, 404.0, 423.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.2, 2.2, p),
              THREE.MathUtils.lerp(2.8, 3.1, p),
              THREE.MathUtils.lerp(2.2, 3.0, p),
            );
            _desiredTarget.set(0.0, 6.0, 18.0);
            desiredFov = 64;
            bokehFocus = 14.5;
          } else if (t < 433.0) {
            // Chapter 14A (423 - 433s): Lesson 1 — Resolute youths standing tall in faith
            const p = THREE.MathUtils.smoothstep(t, 423.0, 433.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-2.1, 1.6, p),
              THREE.MathUtils.lerp(1.65, 1.75, p),
              THREE.MathUtils.lerp(6.8, 6.2, p),
            );
            _desiredTarget.set(0.0, 1.35, 1.8);
            desiredFov = 54;
            bokehFocus = 4.8;
          } else if (t < 446.5) {
            // Chapter 14B (433 - 446.5s): Lesson 2 — Wide tree canopy mercy shade overlooking distant city
            const p = THREE.MathUtils.smoothstep(t, 433.0, 446.5);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(3.2, -2.6, p),
              THREE.MathUtils.lerp(2.4, 2.65, p),
              THREE.MathUtils.lerp(8.4, 9.2, p),
            );
            _desiredTarget.set(0.0, 1.9, 0.5);
            desiredFov = 64;
            bokehFocus = 7.6;
          } else if (t < 470.4) {
            // Chapter 14C (446.5 - 470.4s): Lesson 3 — Quran Rehal ("Say InshaAllah") strictly in front
            const p = THREE.MathUtils.smoothstep(t, 446.5, 470.4);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(1.8, -1.4, p),
              THREE.MathUtils.lerp(2.05, 1.72, p),
              THREE.MathUtils.lerp(5.4, 3.4, p),
            );
            _desiredTarget.set(0.0, 1.12, 0.0);
            desiredFov = THREE.MathUtils.lerp(58, 48, p);
            bokehFocus = THREE.MathUtils.lerp(5.4, 3.6, p);
          } else if (t < 492.0) {
            // Chapter 14D (470.4 - 492s): Lesson 4 — Close illuminated Surah Kahf scripture cleanly in front
            const p = THREE.MathUtils.smoothstep(t, 470.4, 492.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(-1.1, 1.1, p),
              THREE.MathUtils.lerp(1.62, 1.76, p),
              THREE.MathUtils.lerp(2.85, 3.65, p),
            );
            _desiredTarget.set(0.0, 1.1, 0.0);
            desiredFov = THREE.MathUtils.lerp(46, 54, p);
            bokehFocus = THREE.MathUtils.lerp(3.0, 3.8, p);
          } else {
            // Chapter 14E (492 - 527s): Closing reflection & serene dawn horizon pull-back
            const p = THREE.MathUtils.smoothstep(t, 492.0, 527.0);
            _desiredCamPos.set(
              THREE.MathUtils.lerp(2.4, 0.0, p),
              THREE.MathUtils.lerp(2.15, 3.1, p),
              THREE.MathUtils.lerp(7.6, 11.2, p),
            );
            _desiredTarget.set(0.0, THREE.MathUtils.lerp(1.55, 2.35, p), 0.2);
            desiredFov = THREE.MathUtils.lerp(58, 64, p);
            bokehFocus = THREE.MathUtils.lerp(6.4, 9.8, p);
          }

          camera.position.copy(_desiredCamPos);
          controls.target.copy(_desiredTarget);
          if (Math.abs(camera.fov - desiredFov) > 0.05) {
            camera.fov = desiredFov;
            camera.updateProjectionMatrix();
          }
          camera.lookAt(controls.target);
          if (bokehPass) {
            (bokehPass.uniforms as { focus: THREE.IUniform<number> }).focus.value = bokehFocus;
          }
          return;
        }

        if (shot === 'cinema-dolly') {
          const angle = -Math.PI * 0.25 + u * Math.PI * 0.95;
          const rad = r * (1.18 - u * 0.32);
          const height = meta.defaultTarget[1] + 1.35 + Math.sin(u * Math.PI) * 1.1;
          _desiredCamPos.set(
            Math.cos(angle) * rad,
            height,
            Math.sin(angle) * rad,
          );
        } else if (shot === 'hero-orbit') {
          const angle = phase + Math.PI * 0.25;
          const height = meta.defaultTarget[1] + r * 0.34 + Math.sin(phase * 2) * 0.25;
          _desiredCamPos.set(
            Math.cos(angle) * r,
            height,
            Math.sin(angle) * r,
          );
        } else if (shot === 'low-sweep') {
          const angle = -Math.PI * 0.38 + Math.sin(phase * 0.5) * 0.95;
          const rad = r * 0.92;
          _desiredCamPos.set(
            Math.cos(angle) * rad,
            0.78 + Math.sin(u * Math.PI) * 0.45,
            Math.sin(angle) * rad,
          );
          _desiredTarget.y += 0.25;
        } else if (shot === 'crane-dive') {
          const ease = u * u * (3 - 2 * u);
          const angle = Math.PI * 0.2 + ease * Math.PI * 0.65;
          const rad = THREE.MathUtils.lerp(r * 1.35, r * 0.72, ease);
          const height = THREE.MathUtils.lerp(r * 1.15, meta.defaultTarget[1] + 0.55, ease);
          _desiredCamPos.set(
            Math.cos(angle) * rad,
            height,
            Math.sin(angle) * rad,
          );
        }

        const lambda = rt.isRecording ? 12 : 6.0;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _desiredCamPos.x,
          lambda,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _desiredCamPos.y,
          lambda,
          dt,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _desiredCamPos.z,
          lambda,
          dt,
        );

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _desiredTarget.x,
          lambda,
          dt,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _desiredTarget.y,
          lambda,
          dt,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _desiredTarget.z,
          lambda,
          dt,
        );
        if (Math.abs(camera.fov - desiredFov) > 0.05) {
          camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, lambda, dt);
          camera.updateProjectionMatrix();
        }
        camera.lookAt(controls.target);
      };

      // Animation loop with software WebGL pacing guard
      let frameId = 0;
      let disposed = false;
      let lastWallTime = performance.now();
      let lastUiSync = 0;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const tick = () => {
        if (disposed) return;
        const now = performance.now();
        const rawDelta = Math.min(0.1, (now - lastWallTime) / 1000);
        lastWallTime = now;

        const cfg = configRef.current;
        let t = timeRef.current;

        if (rt.isRecording) {
          const stepDt = isSoftwareGl ? Math.min(rawDelta, 1 / 24) : rawDelta;
          rt.recordElapsed += stepDt;
          t = Math.min(cfg.duration, rt.recordElapsed);
          timeRef.current = t;

          const progress = Math.min(100, (t / cfg.duration) * 100);
          if (now - lastUiSync > 70) {
            lastUiSync = now;
            callbacksRef.current.onTimeUpdate(t);
            callbacksRef.current.onRecordingStateChange(true, progress);
          }
        } else if (isPlayingRef.current) {
          t += rawDelta * cfg.speed;
          if (t >= cfg.duration) {
            if (cfg.loop) {
              t = t % cfg.duration;
              audio.seekTo(t);
            } else {
              t = cfg.duration;
              callbacksRef.current.onPlayingChange(false);
            }
          }
          timeRef.current = t;
          if (now - lastUiSync > 50) {
            lastUiSync = now;
            callbacksRef.current.onTimeUpdate(t);
          }
        }

        // Sync Voiceover Audio Engine to timeline
        audio.syncPlayback({
          playing: rt.isRecording || isPlayingRef.current,
          enabled: cfg.audioEnabled,
          timelineTime: timeRef.current,
          speed: rt.isRecording ? 1 : cfg.speed,
        });

        // Update camera choreography first so active scene receives exact camera position
        updateCameraChoreography(
          timeRef.current,
          cfg.duration,
          rawDelta,
          cfg.cameraShot,
          cfg.sceneId,
        );

        // Update 3D Scene
        if (rt.activeScene) {
          rt.activeScene.update(
            timeRef.current,
            cfg.duration,
            cfg.motionIntensity,
            cfg.explodeAmount,
            camera.position,
          );
        }

        renderFrame();

        // Composite frame + Bengali subtitles during recording
        if (rt.isRecording && rt.recordingSession) {
          const activeCue = cfg.subtitlesEnabled
            ? getActiveCue(srtCuesRef.current, timeRef.current)
            : null;
          rt.recordingSession.compositeFrame(activeCue ? activeCue.text : null);

          if (rt.recordElapsed >= cfg.duration) {
            const session = rt.recordingSession;
            rt.isRecording = false;
            rt.recordingSession = null;
            callbacksRef.current.onTimeUpdate(cfg.duration);
            callbacksRef.current.onRecordingStateChange(false, 100);
            callbacksRef.current.onPlayingChange(false);
            session
              .stop()
              .then((video) => {
                callbacksRef.current.onVideoReady(video);
              })
              .catch((err) => {
                if (err instanceof Error && err.message !== 'Recording cancelled') {
                  callbacksRef.current.onError(err.message);
                }
              });
          }
        }

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      tick();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        window.removeEventListener('resize', handleResize);
        controls.removeEventListener('start', handleControlsStart);
        renderer.domElement.removeEventListener(
          'webglcontextlost',
          handleContextLost,
        );
        renderer.domElement.removeEventListener(
          'webglcontextrestored',
          handleContextRestored,
        );

        if (rt.recordingSession) {
          rt.recordingSession.cancel();
        }
        audio.dispose();
        if (rt.activeScene) {
          rt.activeScene.dispose();
        }
        floorGeo.dispose();
        materials.dispose();
        textures.dispose();
        envRT.dispose();
        controls.dispose();
        if (bokehPass) {
          bokehPass.dispose();
        }
        if (composer) {
          composer.dispose();
        }
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    }, []);

    return (
      <div className="relative w-full h-full bg-[#070a12]">
        <div ref={mountRef} className="w-full h-full" />

        {contextLost && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070a12]/95 px-6 text-center">
            <p className="font-display text-lg font-semibold text-slate-100">
              WebGL Rendering Context Paused
            </p>
            <p className="mt-1.5 max-w-md text-sm text-slate-400">
              Your browser temporarily reclaimed the graphics context. Reload or restore the tab to resume 3D rendering.
            </p>
          </div>
        )}
      </div>
    );
  },
);
