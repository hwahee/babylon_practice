import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui"
import { ArcRotateCamera, Camera, Color3, Color4, Engine, FreeCamera, HemisphericLight, Light, Matrix, Mesh, MeshBuilder, PointLight, Quaternion, Scene, ShadowGenerator, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Environment } from "./objects/Environment";
import { Player } from "./system/CharacterController";

enum State { START, GAME, LOSE, CUTSCENE }

const setBtn = (b: Button, op: { w?: number | string, h?: number | string, color?: string, top?: string, left?: string, thick?: number, vAlign?: number, hAlign?: number }): void => {
	b.width = op.w ?? b.width,
		b.height = op.h ?? b.height,
		b.color = op.color ?? b.color,
		b.top = op.top ?? b.top,
		b.left = op.left ?? b.left,
		b.thickness = op.thick ?? b.thickness,
		b.verticalAlignment = op.vAlign ?? b.verticalAlignment
	b.horizontalAlignment = op.hAlign ?? b.horizontalAlignment
}

class App {
	private _canvas: HTMLCanvasElement
	private _engine: Engine
	private _scene: Scene
	private _camera: ArcRotateCamera
	private _light: Light

	private _state: number = State.START
	private _gameScene: Scene | undefined
	private _cutScene: Scene | undefined

	private _environment: Environment | undefined
	public assets: any
	private _player: Player | undefined

	constructor() {
		// create the canvas html element and attach it to the webpage
		this._canvas = document.createElement("canvas") as HTMLCanvasElement
		this._canvas.style.width = "100%"
		this._canvas.style.height = "100%"
		this._canvas.id = "gameCanvas"
		document.body.appendChild(this._canvas)

		// initialize babylon scene and engine
		this._engine = new Engine(this._canvas, true)
		this._scene = new Scene(this._engine)

		this._camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), this._scene)
		this._camera.attachControl(this._canvas, true)
		this._light = new HemisphericLight("light1", new Vector3(1, 1, 0), this._scene)

		let sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this._scene)
		// let ground: Mesh = MeshBuilder.CreateGround("groundPlane", { width: 6, height: 6, subdivisions: 2 }, this.scene)

		// hide/show the Inspector
		window.addEventListener("keydown", (e) => {
			// Shift+Ctrl+Alt+I
			if (e.shiftKey && e.ctrlKey && e.altKey && e.key == "I") {
				if (this._scene.debugLayer.isVisible()) {
					this._scene.debugLayer.hide()
				} else {
					this._scene.debugLayer.show()
				}
			}
		})

		this._main()
	}

	private _loadCharacterAssets(scene: Scene) {
		async function loadCharacter() {
			const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene)
			outer.isVisible = false
			outer.isPickable = false
			outer.checkCollisions = true

			outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

			outer.ellipsoid = new Vector3(1, 1.5, 1)
			outer.ellipsoidOffset = new Vector3(0, 1.5, 0)

			outer.rotationQuaternion = new Quaternion(0, 1, 0, 0)		//TPS처럼 플레이어의 등을 보기 위해

			const box = MeshBuilder.CreateBox("Small1", {
				width: 0.5, depth: 0.5, height: 0.25, faceColors: [
					new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1),
				]
			}, scene)
			box.position.y = 1.5
			box.position.z = 1

			const body = MeshBuilder.CreateCylinder("body", { height: 3, diameterTop: 2, diameterBottom: 2, tessellation: 0, subdivisions: 0 }, scene)
			const bodymt1 = new StandardMaterial("red", scene)
			bodymt1.diffuseColor = new Color3(0.8, 0.5, 0.5)
			body.material = bodymt1
			body.isPickable = false
			body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

			box.parent = body
			body.parent = outer

			return {
				mesh: outer as Mesh
			}
		}
		return loadCharacter().then((assets) => {
			this.assets = assets
		})
	}
	private async _initializeGameAsync(scene: Scene): Promise<void> {
		let light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene)
		const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene)
		light.diffuse = new Color3(0.08, 0.1, 0.15)
		light.intensity = 35
		light.radius = 1

		const shadowGenerator = new ShadowGenerator(1024, light)
		shadowGenerator.darkness = 0.4

		//create player
		this._player = new Player(this.assets, scene, shadowGenerator)
	}

	private _middle_setUpScene(): [Scene, Camera] {
		this._scene.detachControl()
		let tempScene = new Scene(this._engine)
		tempScene.clearColor = new Color4(0, 0, 0, 1)
		let tempCamera = new FreeCamera("camera1", new Vector3(0, 0, 0), tempScene)
		tempCamera.setTarget(Vector3.Zero())

		return [tempScene, tempCamera]
	}
	private async _gotoStart() {
		this._engine.displayLoadingUI()

		//Scene setup
		let [tempScene, tempCamera] = this._middle_setUpScene()

		//create a fullscreen ui for all of our GUI elements
		const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI")
		guiMenu.idealHeight = 720

		//button
		const startBtn = Button.CreateSimpleButton("start", "PLAY")
		setBtn(startBtn, { w: 0.2, h: "40px", color: "white", top: "-14px", thick: 0, vAlign: Control.VERTICAL_ALIGNMENT_BOTTOM })
		guiMenu.addControl(startBtn)
		//this handles interactions with the start button attached to the scene
		startBtn.onPointerDownObservable.add(() => {
			this._gotoCutScene()
			tempScene.detachControl()
		})

		//scene finished loading
		await tempScene.whenReadyAsync()
		this._engine.hideLoadingUI()
		this._scene.dispose()
		this._scene = tempScene
		this._state = State.START
	}
	private async _gotoCutScene(): Promise<void> {
		this._engine.displayLoadingUI()

		//Scene setup
		this._scene.detachControl()
		this._cutScene = new Scene(this._engine)
		let tempCamera = new FreeCamera("camera1", new Vector3(0, 0, 0), this._cutScene)
		tempCamera.setTarget(Vector3.Zero())
		this._cutScene.clearColor = new Color4(0, 0, 0, 1)

		//create a fullscreen ui for all of our GUI elements
		const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene")

		//progress dialogue
		const next = Button.CreateSimpleButton("next", "NEXT")
		setBtn(next, {
			color: "white", thick: 0, vAlign: Control.VERTICAL_ALIGNMENT_BOTTOM, hAlign: Control.HORIZONTAL_ALIGNMENT_RIGHT,
			w: "64px", h: "64px", top: "-3%", left: "-12%"
		})
		cutScene.addControl(next)

		next.onPointerUpObservable.add(() => {
			this._gotoGame()
		})

		//scene finished loading
		await this._cutScene.whenReadyAsync()
		this._engine.hideLoadingUI()
		this._scene.dispose()
		this._state = State.CUTSCENE
		this._scene = this._cutScene

		let finishedLoading = false
		await this._setUpGame().then((res) => {
			finishedLoading = true
		})
	}
	private async _gotoLose(): Promise<void> {
		this._engine.displayLoadingUI()

		//Scene setup
		let [tempScene, tempCamera] = this._middle_setUpScene()

		//create a fullscreen ui for all of our GUI elements
		const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI")

		//button
		const mainBtn = Button.CreateSimpleButton("mainmenu", "MAIN MENU")
		setBtn(mainBtn, { w: 0.2, h: "40px", color: "white" })
		guiMenu.addControl(mainBtn)
		//this handles interactions with the start button attached to the scene
		mainBtn.onPointerUpObservable.add(() => {
			this._gotoStart()
		})

		//scene finished loading
		await tempScene.whenReadyAsync()
		this._engine.hideLoadingUI()
		this._scene.dispose()
		this._scene = tempScene
		this._state = State.LOSE
	}
	private async _setUpGame() {
		//create scene
		let tempScene = new Scene(this._engine)
		this._gameScene = tempScene

		//create environment
		const environment: Environment = new Environment(tempScene)
		this._environment = environment
		await this._environment.load()

		//create character
		await this._loadCharacterAssets(tempScene)
	}
	private async _gotoGame() {
		this._scene.detachControl()
		let tempScene = this._gameScene
		tempScene!.clearColor = new Color4(0.01, 0.01, 0.20)

		//gui
		const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI")
		tempScene?.detachControl()

		const loseBtn = Button.CreateSimpleButton("lose", "LOSE")
		setBtn(loseBtn, {
			w: 0.2, h: "40px", color: "white", top: "-14px", thick: 0, vAlign: Control.VERTICAL_ALIGNMENT_BOTTOM
		})
		playerUI.addControl(loseBtn)
		loseBtn.onPointerDownObservable.add(() => {
			this._gotoLose()
			tempScene?.detachControl()
		})

		await this._initializeGameAsync(tempScene!)

		await tempScene!.whenReadyAsync()
		tempScene!.getMeshByName("outer")!.position = new Vector3(0, 3, 0)

		this._scene.dispose()
		this._state - State.GAME
		this._scene = tempScene!
		this._engine.hideLoadingUI()
		this._scene.attachControl()
	}

	private async _main(): Promise<void> {
		await this._gotoStart()

		this._engine.runRenderLoop(() => {
			switch (this._state) {
				case State.START:
					this._scene.render()
					break
				case State.CUTSCENE:
					this._scene.render()
					break
				case State.GAME:
					this._scene.render()
					break
				case State.LOSE:
					this._scene.render()
					break
				default:
					break
			}
		})

		window.addEventListener("resize", () => {
			this._engine.resize()
		})
	}
}

const app: App = new App()
