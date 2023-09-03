// Copyright (C) 2023 Shpz<shaaapz@gmail.com>. All Rights Reserved.
import { Component, EventTouch, Input, _decorator } from 'cc';
import { InputSystem } from './InputSystem';
import { EInputCode } from './InputSystemConfig';

const { ccclass, property, disallowMultiple } = _decorator;

@ccclass('GamepadTouch')
@disallowMultiple
export class GamepadTouch extends Component {
    @property({
        type: EInputCode,
        tooltip: "触摸输入键"
    })
    private inputCode: EInputCode = EInputCode.NONE;

    start() {
        this.registerListener();
    }

    protected registerListener() {
        let target = this.node;
        target.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        target.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        target.on(Input.EventType.TOUCH_END, this.onTouchCancel, this);
    }

    protected onTouchStart() {
        let inputCode = this.inputCode;
        let inputSystem = InputSystem.inst as InputSystem;
        inputSystem.onTouchStart(inputCode);
    }

    protected onTouchEnd() {
        let inputCode = this.inputCode;
        let inputSystem = InputSystem.inst as InputSystem;
        inputSystem.onTouchEnd(inputCode);
    }

    protected onTouchCancel() {
        let inputCode = this.inputCode;
        let inputSystem = InputSystem.inst as InputSystem;
        inputSystem.onTouchCancel(inputCode);
    }
}