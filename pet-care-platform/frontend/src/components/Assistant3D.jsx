import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, useAnimations, useGLTF } from '@react-three/drei'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'

const MODEL_URL = '/models/assistant.glb?v=9'
const LOOK_LIMIT = 0.35
const PULSE_DURATION = 0.45

const lerp = (from, to, by) => from + (to - from) * by
const pickWaveAction = (names) => {
  const candidates = ['wave', 'hand', 'greet', 'hello', 'hi']
  return names.find((name) =>
    candidates.some((candidate) => name.toLowerCase().includes(candidate))
  )
}

const AssistantModel = forwardRef(function AssistantModel(props, ref) {
  const group = useRef(null)
  const pulseStartRef = useRef(0)
  const waveTimeoutRef = useRef(null)
  const [activeAction, setActiveAction] = useState(null)
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(animations, group)
  const { mouse, clock } = useThree()

  useEffect(() => {
    scene.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      const materials = Array.isArray(node.material) ? node.material : [node.material]
      materials.forEach((material) => {
        if (!material) return
        if (material.map) {
          material.map.colorSpace = THREE.SRGBColorSpace
        }
        if (material.emissiveMap) {
          material.emissiveMap.colorSpace = THREE.SRGBColorSpace
        }
        material.needsUpdate = true
      })
    })
  }, [scene])

  useEffect(() => {
    if (names.length > 0 && !activeAction) {
      setActiveAction(names[0])
    }
  }, [activeAction, names])

  useEffect(() => {
    if (!activeAction) return undefined
    const action = actions[activeAction]
    if (!action) return undefined
    action.reset().fadeIn(0.2).play()
    return () => action.fadeOut(0.2)
  }, [actions, activeAction])

  useFrame((state) => {
    if (!group.current) return
    const { clock } = state
    const targetX = -mouse.y * LOOK_LIMIT
    const targetY = mouse.x * LOOK_LIMIT
    group.current.rotation.x = lerp(group.current.rotation.x, targetX, 0.08)
    group.current.rotation.y = lerp(group.current.rotation.y, targetY, 0.08)

    const elapsed = clock.getElapsedTime()
    const idleOffset = Math.sin(elapsed * 1.4) * 0.03
    group.current.position.y = -0.9 + idleOffset

    if (pulseStartRef.current) {
      const pulseElapsed = elapsed - pulseStartRef.current
      if (pulseElapsed < PULSE_DURATION) {
        const pulseScale = 1 + Math.sin((pulseElapsed / PULSE_DURATION) * Math.PI) * 0.06
        group.current.scale.set(pulseScale, pulseScale, pulseScale)
      } else {
        group.current.scale.set(1, 1, 1)
        pulseStartRef.current = 0
      }
    }
  })

  const triggerWave = useCallback(() => {
    pulseStartRef.current = clock.getElapsedTime()
    const idleActionName = activeAction || names[0]
    const waveActionName = pickWaveAction(names) || names[1]
    if (!waveActionName || !actions[waveActionName]) return
    const waveAction = actions[waveActionName]
    waveAction.reset()
    waveAction.clampWhenFinished = true
    waveAction.setLoop(THREE.LoopOnce, 1)
    waveAction.fadeIn(0.1).play()

    if (idleActionName && actions[idleActionName]) {
      clearTimeout(waveTimeoutRef.current)
      const durationMs = waveAction.getClip().duration * 1000
      waveTimeoutRef.current = setTimeout(() => {
        waveAction.fadeOut(0.1)
        actions[idleActionName].reset().fadeIn(0.2).play()
      }, durationMs)
    }
  }, [actions, activeAction, clock, names])

  useImperativeHandle(ref, () => ({
    triggerWave,
  }), [triggerWave])

  return <primitive ref={group} object={scene} onPointerDown={triggerWave} />
})

export default function Assistant3D() {
  const modelRef = useRef(null)

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      modelRef.current?.triggerWave?.()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 260,
        height: 260,
        zIndex: 40,
        pointerEvents: 'auto',
      }}
      role="button"
      tabIndex={0}
      aria-label="3D ассистент. Нажмите, чтобы он помахал."
      onClick={() => modelRef.current?.triggerWave?.()}
      onKeyDown={handleKeyDown}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 2.4], fov: 45 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1
        }}
      >
        <color attach="background" args={['#f8fafc']} />
        <ambientLight intensity={0.7} />
        <hemisphereLight skyColor="#ffffff" groundColor="#cbd5f5" intensity={0.65} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} castShadow />
        <pointLight position={[-2, 1.5, 2]} intensity={0.5} />
        <Environment preset="sunset" />
        <AssistantModel ref={modelRef} />
      </Canvas>
    </div>
  )
}

useGLTF.preload(MODEL_URL)