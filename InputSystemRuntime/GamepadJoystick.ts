// Copyright (C) 2023 Shpz<shaaapz@gmail.com>. All Rights Reserved.
import { Component, EventTouch, Input, Node, Size, UITransform, v2, Vec2, Vec3, _decorator } from 'cc';
import { InputSystem, toVec2, toVec3 } from './InputSystem';
import { EInputCode } from './InputSystemConfig';

const { ccclass, property, disallowMultiple } = _decorator;

@ccclass('GamepadJoystick')
@disallowMultiple
export class GamepadJoystick extends Component {
    @property({
        type: Node,
        tooltip: "拇指"
    })
    private thumb: Node;

    @property({
        type: Node,
        tooltip: "背景"
    })
    private background: Node;

    @property({
        type: EInputCode,
        tooltip: "主输入键代码"
    })
    private mainInputCode: EInputCode = EInputCode.NONE;

    @property({
        type: EInputCode,
        tooltip: "副输入键代码"
    })
    private altInputCode: EInputCode = EInputCode.NONE;

    private backgroundOriginSize: Size;
    private backgroundPosition: Vec2;

    start() {
        this.backgroundOriginSize = this.background.getComponent(UITransform).contentSize.clone();
        this.backgroundPosition = toVec2(this.background.getWorldPosition());

        this.registerListener();
    }

    protected registerListener() {
        let target = this.background;
        target.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        target.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        target.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        target.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    protected onTouchStart(event: EventTouch) {
        this.calculateThumb(event.getUILocation());
    }

    protected onTouchMove(event: EventTouch) {
        this.calculateThumb(event.getUILocation());
    }

    protected onTouchEnd() {
        let inputSystem = InputSystem.inst as InputSystem;
        if (this.mainInputCode !== EInputCode.NONE) {
            inputSystem.onTouchEnd(this.mainInputCode);
        }

        if (this.altInputCode !== EInputCode.NONE) {
            inputSystem.onTouchEnd(this.altInputCode);
        }

        this.thumb.setPosition(Vec3.ZERO);
    }

    protected onTouchCancel() {
        let inputSystem = InputSystem.inst as InputSystem;
        if (this.mainInputCode !== EInputCode.NONE) {
            inputSystem.onTouchCancel(this.mainInputCode);
        }

        if (this.altInputCode !== EInputCode.NONE) {
            inputSystem.onTouchCancel(this.altInputCode);
        }

        this.thumb.setPosition(Vec3.ZERO);
    }
    
    protected calculateThumb(start: Vec2) {
        let relativeLoc = start.subtract(this.backgroundPosition);
        let radius = this.backgroundOriginSize.width * 0.5;

        if (relativeLoc.length() > radius) {
            let a = relativeLoc.normalize();
            let b = Vec2.UNIT_X.clone();
            let c = Vec2.UNIT_Y.clone();
            let cosd1 = a.dot(b);
            let cosd2 = a.dot(c);
            relativeLoc.x = cosd1 * radius;
            relativeLoc.y = cosd2 * radius;
        }

        let axisX = relativeLoc.x / radius;
        let axisY = relativeLoc.y / radius;

        let inputSystem = InputSystem.inst as InputSystem;
        if (this.mainInputCode !== EInputCode.NONE) {
            inputSystem.onJoystick(this.mainInputCode, axisX);
        }

        if (this.altInputCode !== EInputCode.NONE) {
            inputSystem.onJoystick(this.altInputCode, axisY);
        }

        let uitrans = this.background.getComponent(UITransform);
        let thumbLoc = relativeLoc.add(this.backgroundPosition);
        let localLoc = uitrans.convertToNodeSpaceAR(toVec3(thumbLoc));
        this.thumb.setPosition(localLoc);
    }
}