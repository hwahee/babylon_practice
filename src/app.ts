import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import * as BABYLON from "@babylonjs/core";

class App {
	private canvas: HTMLCanvasElement
	private engine: BABYLON.Engine
	private scene: BABYLON.Scene
	private camera: BABYLON.ArcRotateCamera
	private light: BABYLON.Light

	constructor() {
		// create the canvas html element and attach it to the webpage
		this.canvas = document.createElement("canvas") as HTMLCanvasElement
		this.canvas.style.width = "100%"
		this.canvas.style.height = "100%"
		this.canvas.id = "gameCanvas"
		document.body.appendChild(this.canvas)

		// initialize babylon scene and engine
		this.engine = new BABYLON.Engine(this.canvas, true)
		this.scene = new BABYLON.Scene(this.engine)

		this.camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), this.scene)
		this.camera.attachControl(this.canvas, true)
		this.light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene)

		let sphere: BABYLON.Mesh = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.scene)
		let ground: BABYLON.Mesh = BABYLON.MeshBuilder.CreateGround("groundPlane", { width: 6, height: 6, subdivisions: 2 }, this.scene)

		window.addEventListener("resize", () => {
			this.engine.resize()
		})

		// hide/show the Inspector
		window.addEventListener("keydown", (e) => {
			// Shift+Ctrl+Alt+I
			if (e.shiftKey && e.ctrlKey && e.altKey && e.key=="I") {
				if (this.scene.debugLayer.isVisible()) {
					this.scene.debugLayer.hide()
				} else {
					this.scene.debugLayer.show()
				}
			}
		});
	}

	run(): void {
		// run the main render loop
		this.engine.runRenderLoop(() => {
			this.scene.render()
		})
	}
}

const app: App = new App()
app.run()
