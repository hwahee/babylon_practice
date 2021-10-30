import { ArcRotateCamera, Camera, HemisphericLight, Mesh, MeshBuilder, Scene, ShadowGenerator, TransformNode, UniformBuffer, UniversalCamera, Vector3 } from "@babylonjs/core";

class Player extends TransformNode {
	static ORIGINAL_TILT = Vector3.Zero()

	private _camRoot: TransformNode | undefined
	public camera: UniversalCamera | undefined
	private _yTilt: TransformNode | undefined

	public scene: Scene
	private _input: any

	public mesh: Mesh

	constructor(assets: any, scene: Scene, shadowGen: ShadowGenerator, input?: any) {
		super("player", scene)
		this.scene = scene
		this._setupPlayerCamera()

		this.mesh = assets.mesh
		this.mesh.parent = this

		shadowGen.addShadowCaster(assets.mesh)

		this._input = input
	}
	private _setupPlayerCamera() {
		this._camRoot = new TransformNode("root")
		this._camRoot.position = new Vector3(0, 0, 0)
		this._camRoot.rotation = new Vector3(0, Math.PI, 0)

		let yTilt = new TransformNode("ytilt")
		yTilt.rotation = Player.ORIGINAL_TILT
		this._yTilt = yTilt
		yTilt.parent=this._camRoot

		this.camera=new UniversalCamera("cam", new Vector3(0, 0, -30), this.scene)
		this.camera.lockedTarget=this._camRoot.position

		this.camera.fov=0.47
		this.camera.parent=yTilt

		this.scene.activeCamera=this.camera

		return this.camera

	}
}

export { Player }