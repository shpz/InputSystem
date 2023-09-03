import { game } from 'cc';
import { clamp, Component, Node, Quat, quat, RigidBody, v3, Vec3, _decorator } from 'cc';
import { InputSystem } from './InputSystem/InputSystem';

const { ccclass, property } = _decorator;

@ccclass('Character')
export class Character extends Component {
    @property
    private jumpPower = 10;

    @property
    private moveSpeed = 10;

    @property
    private turnSpeed = 2;

    @property
    private lookUpSpeed = 2;
    
    private rigidbody: RigidBody;

    private linerVelocity = v3();

    private cameraNode: Node;

    private currentLookUp = 0;

    private turnInput = 0;

    private lookUpInput = 0;

    private moveInput = v3();

    start() {
        this.rigidbody = this.getComponent(RigidBody);
        this.cameraNode = this.node.getChildByName("Main Camera");

        this.initializeInput();
    }

    update(deltaTime: number) {
        let direction = this.moveInput.normalize();
        let velocity = direction.multiplyScalar(this.moveSpeed);

        this.rigidbody.getLinearVelocity(this.linerVelocity);
        this.linerVelocity.x = velocity.x;
        this.linerVelocity.z = velocity.z;
        this.rigidbody.setLinearVelocity(this.linerVelocity);

        let turnDelta = this.turnInput * this.turnSpeed * deltaTime;
        let turnQuat = Quat.fromAxisAngle(quat(), Vec3.UP, turnDelta);
        this.rigidbody.node.rotate(turnQuat);

        let lastLookUp = this.currentLookUp;
        let lookUpDelta = this.lookUpInput * this.lookUpSpeed * deltaTime;
        this.currentLookUp = clamp(this.currentLookUp + lookUpDelta, -0.2, 0.5);
        lookUpDelta = this.currentLookUp - lastLookUp;

        let lookUpQuat = Quat.fromAxisAngle(quat(), Vec3.RIGHT, lookUpDelta);
        this.cameraNode.rotate(lookUpQuat);

        this.moveInput.set();
        this.turnInput = 0;
        this.lookUpInput = 0;
    }

    private initializeInput() {
        InputSystem.inst.bindAxis("MoveForward", this.moveForward, this);
        InputSystem.inst.bindAxis("MoveRight", this.moveRight, this);
        InputSystem.inst.bindAxis("Turn", this.turn, this);
        InputSystem.inst.bindAxis("TurnRate", this.turnRate, this);
        InputSystem.inst.bindAxis("LookUp", this.lookUp, this);
        InputSystem.inst.bindAxis("LookUpRate", this.lookUpRate, this);

        InputSystem.inst.bindAction("Jump", this.jump, this);
        InputSystem.inst.bindAction("Sprint", this.sprint, this);
        InputSystem.inst.bindAction("Fire", this.fire, this);
    }

    private moveForward(value: number) {
        let forward = this.node.forward.normalize().multiplyScalar(value);
        this.moveInput.add(forward);
    }

    private moveRight(value: number) {
        let right = this.node.right.normalize().multiplyScalar(value);
        this.moveInput.add(right);
    }

    private turn(value: number) {
        this.turnInput = value
    }

    private lookUp(value: number) {
        this.lookUpInput = value;
    }

    private turnRate(value: number) {
        this.turnInput = value;
    }

    private lookUpRate(value: number) {
        this.lookUpInput = value;
    }

    // 跳跃
    private jump() {
        // 添加冲力
        this.rigidbody.applyImpulse(v3(0, this.jumpPower, 0));
        return true;
    }


    // 冲刺
    private sprint() {
        console.log("Sprint_", Date.now());
        return true;
    }

    // 发射
    private fire() {
        console.log("Fire_", Date.now());
        return true;
    }
}