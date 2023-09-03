// Copyright (C) 2023 Shpz<shaaapz@gmail.com>. All Rights Reserved.
import { assetManager, Canvas, Director, director, EventGamepad, EventKeyboard, EventMouse, find, Input, input, instantiate, Prefab, sys, v2, v3, Vec2, Vec3 } from "cc";
import { EInputCode, InputSystemConfig } from "./InputSystemConfig";

/**
 * 输入系统。
 * 
 * 外部通过单例访问
 */
export class InputSystem implements IInputSystem {
    /**
     * 处于按下状态的键码。
     */
    protected pressedCodes = new Set();

    /**
     * 触摸长按处理器。
     */
    protected touchHeldHandler = new HeldEventHandler(this.processTouchHeld, this);

    /**
     * 键盘长按处理器。
     */
    protected keyHeldHandler = new HeldEventHandler(this.processKeyHeld, this);

    /**
     * 鼠标长按处理器。
     */
    protected mouseHeldHandler = new HeldEventHandler(this.processMouseHeld, this);

    /**
     * 手柄长按处理器。
     */
    protected gamepadHeldHandler = new HeldEventHandler(this.processGamepadHeld, this);

    /**
     * 轴映射实例 Map
     */
    protected axisMappingMap: Map<MappingName, AxisMapping> = new Map();

    /**
     * 操作映射实例 Map
     */
    protected actionMappingMap: Map<MappingName, ActionMapping> = new Map();

    protected constructor() {
        this.initializeKeyboard();
        this.initializeMouse();
        this.initializeTouch();
        // this.initializeGamepad();
    }

    protected static _inst: InputSystem;
    public static get inst(): IInputSystem {
        if (!InputSystem._inst) {
            InputSystem._inst = new InputSystem();
        }

        return InputSystem._inst;
    }

    /**
     * 初始化键盘
     */
    protected initializeKeyboard() {
        if (sys.os === sys.OS.WINDOWS || sys.os === sys.OS.OSX) {
            input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
    }

    /**
     * 初始化鼠标
     */
    protected initializeMouse() {
        if (sys.os === sys.OS.WINDOWS || sys.os === sys.OS.OSX) {
            input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
            input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        }
    }

    /**
     * 初始化触摸
     */
    protected initializeTouch() {
        if (InputSystemConfig.alwaysShowTouch || sys.os === sys.OS.ANDROID || sys.os === sys.OS.IOS) {
            if (InputSystemConfig.touchPrefabUuid) {
                assetManager.loadAny({ uuid: InputSystemConfig.touchPrefabUuid }, (error, asset: Prefab) => {
                    if (error) {
                        console.error(error);
                    }
                    else {
                        let uiRoot = find("Canvas");
                        if (uiRoot && uiRoot.getComponent(Canvas)) {
                            let node = instantiate(asset);
                            node.parent = uiRoot;
                        }
                        else {
                            console.error("场景中必须存在 UI Canvas 根节点。The UI Canvas root node must exist in the scene.");
                        }
                    }
                });
            }
        }
    }

    /**
     * 初始化手柄。
     * 
     * 所有操作系统都可能使用手柄，监听到手柄链接/断开事件，然后注册/注销手柄输入事件。
     * 
     * @todo 手柄输入 3.8.1 有严重 BUG 搁置等待修复。
     */
    protected initializeGamepad() {
        input.on(Input.EventType.GAMEPAD_CHANGE, this.onGamepadChange, this);
    }

    /**
     * 获取键码是否按下
     * 
     * @param inputCode 
     * @returns 
     */
    public getCodePressed(inputCode: EInputCode): boolean {
        return this.pressedCodes.has(inputCode);
    }

    /**
     * 绑定轴映射
     * 
     * @param mappingName 映射名
     * @param func 处理函数
     * @param target 函数目标
     */
    public bindAxis(mappingName: MappingName, func: Func1P<number, void>, target: any): void {
        // 检查配置中是否有这个映射名
        if (InputSystemConfig.axisMappingSet[mappingName]) {
            // 检查是不是已经绑定了这个映射
            if (!this.axisMappingMap.has(mappingName)) {
                let mapping = new AxisMapping(mappingName, func, target);
                this.axisMappingMap.set(mappingName, mapping);
            }
        }
    }

    /**
     * 绑定操作映射
     * 
     * @param mappingName 映射名
     * @param func 处理函数
     * @param target 函数目标
     */
    public bindAction(mappingName: MappingName, func: Func<void>, target: any): void {
        // 检查配置中是否有这个映射名
        if (InputSystemConfig.actionMappingSet[mappingName]) {
            // 检查是不是已经绑定了这个映射
            if (!this.actionMappingMap.has(mappingName)) {
                let mapping = new ActionMapping(mappingName, func, target);
                this.actionMappingMap.set(mappingName, mapping);
            }
        }
    }

    /**
     * 处理键按下输入
     * 
     * @param inputCode 输入代码
     */
    protected processKeyDown(inputCode: EInputCode): void {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }
            }
        }
    }

    /**
     * 处理键按住输入
     * 
     * @param inputCode 输入代码
     */
    protected processKeyHeld(inputCode: EInputCode): void {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(1 * scale);
                }
            }
        }
    }

    /**
     * 处理键松开输入
     * 
     * @param inputCode 输入代码
     */
    protected processKeyUp(inputCode: EInputCode): void {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.delete(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];

            for (let name of names) {
                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    mapping.cancel();
                }
            }
        }
    }

    /**
     * 处理鼠标按下输入
     * 
     * @param inputCode 
     */
    protected processMouseDown(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }
            }
        }
    }

    /**
     * 处理鼠标松开输入
     * 
     * @param inputCode 
     */
    protected processMouseUp(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.delete(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }
            }
        }
    }

    /**
     * 处理鼠标移动输入
     * 
     * @param inputCode 输入代码
     * @param value     轴值
     */
    protected processMouseMove(inputCode: EInputCode, value: number) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }

                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(value * scale);
                }
            }
        }
    }

    /**
     * 处理鼠标滚轮输入
     * 
     * @param inputCode 输入代码
     * @param value     轴值
     */
    protected processMouseWheel(inputCode: EInputCode, value: number) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }

                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(value * scale);
                }
            }
        }
    }

    /**
     * 处理鼠标按住输入
     * 
     * @param inputCode 输入代码
     */
    protected processMouseHeld(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(1 * scale);
                }
            }
        }
    }

    /**
     * 处理游戏手柄按住输入
     * 
     * @param inputCode 
     */
    protected processGamepadHeld(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(1 * scale);
                }
            }
        }
    }

    /**
     * 处理触摸开始输入
     * 
     * @param inputCode 输入代码
     */
    protected processTouchStart(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }
            }
        }
    }

    /**
     * 处理触摸按住输入
     * 
     * @param inputCode 输入代码
     */
    protected processTouchHeld(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(1 * scale);
                }
            }
        }
    }

    /**
     * 处理触摸结束输入
     * 
     * @param inputCode 输入代码
     */
    protected processTouchEnd(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.delete(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.cancel();
                }

                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    mapping.cancel();
                }
            }
        }
    }

    /**
     * 处理触摸取消输入
     * 
     * @param inputCode 输入代码
     */
    protected processTouchCancel(inputCode: EInputCode) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.delete(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.cancel();
                }

                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    mapping.cancel();
                }
            }
        }
    }

    /**
     * 处理虚拟摇杆输入
     * 
     * @param inputCode 输入代码
     * @param value     轴值
     */
    protected processJoystick(inputCode: EInputCode, value: number) {
        if (InputSystemConfig.inputCodeToMappingNameSet[inputCode]) {
            this.pressedCodes.add(inputCode);

            // 映射名
            let names = InputSystemConfig.inputCodeToMappingNameSet[inputCode];
            for (let name of names) {
                if (this.actionMappingMap.has(name)) {
                    let mapping = this.actionMappingMap.get(name);
                    mapping.execute();
                }

                if (this.axisMappingMap.has(name)) {
                    let mapping = this.axisMappingMap.get(name);
                    let scale = InputSystemConfig.axisMappingSet[name][inputCode].scale;
                    mapping.execute(value * scale);
                }
            }
        }
    }

    /**
     * 处理游戏手柄输入
     * 
     * @param inputCode 输入代码
     * @param value     轴值
     */
    protected processGamepadInput(inputCode: EInputCode, value: number) {

    }

    /////////////////////////////// 事件回调 ////////////////////////////////////

    public onTouchStart(code: EInputCode) {
        this.touchHeldHandler.eventStart(code);
        this.processTouchStart(code);
    }

    public onTouchEnd(code: EInputCode) {
        this.touchHeldHandler.eventEnd(code);
        this.processTouchEnd(code);
    }

    public onTouchCancel(code: EInputCode) {
        this.touchHeldHandler.eventEnd(code);
        this.processTouchCancel(code);
    }

    public onJoystick(inputCode: EInputCode, value: number) {
        this.processJoystick(inputCode, value);
    }

    protected onKeyDown(event: EventKeyboard) {
        let inputCode = cast<EInputCode>(event.keyCode);
        this.keyHeldHandler.eventStart(inputCode);
        this.processKeyDown(inputCode);
    }

    protected onKeyUp(event: EventKeyboard) {
        let inputCode = cast<EInputCode>(event.keyCode);
        this.keyHeldHandler.eventEnd(inputCode);
        this.processKeyUp(inputCode);
    }

    protected onMouseMove(event: EventMouse) {
        let deltaX = event.getDeltaX();
        let deltaY = event.getDeltaY();
        this.processMouseMove(EInputCode.MouseX, deltaX);
        this.processMouseMove(EInputCode.MouseY, deltaY);
    }

    protected onMouseDown(event: EventMouse) {
        let mouseButton = event.getButton();
        let inputCode = InputSystemConfig.mouseButtonToInputCodeSet[mouseButton];
        this.mouseHeldHandler.eventStart(inputCode);
        this.processMouseDown(inputCode);
    }

    protected onMouseUp(event: EventMouse) {
        let mouseButton = event.getButton();
        let inputCode = InputSystemConfig.mouseButtonToInputCodeSet[mouseButton];
        this.mouseHeldHandler.eventEnd(inputCode);
        this.processMouseUp(inputCode);
    }

    protected onMouseWheel(event: EventMouse) {
        let scrollX = event.getScrollX();
        let scrollY = event.getScrollY();
        this.processMouseWheel(EInputCode.MouseWheelX, scrollX);
        this.processMouseWheel(EInputCode.MouseWheelY, scrollY);
    }

    protected onGamepadInput(event: EventGamepad) {

    }

    protected onGamepadChange(event: EventGamepad) {        
        if (event.gamepad) {
            input.on(Input.EventType.GAMEPAD_INPUT, this.onGamepadInput, this);
        }
        else {
            input.off(Input.EventType.GAMEPAD_INPUT, this.onGamepadInput, this);
        }
    }
}

/**
 * 按住事件处理器
 */
export class HeldEventHandler {
    protected heldCodes: Set<EInputCode> = new Set();

    constructor(protected func: Function, protected target: any) {
        director.on(
            Director.EVENT_AFTER_UPDATE,
            this.update,
            this
        );
    }

    public eventStart(code: EInputCode) {
        this.heldCodes.add(code);
    }

    public eventEnd(code: EInputCode) {
        this.heldCodes.delete(code);
    }

    protected update() {
        this.heldCodes.forEach((code) => {
            this.func.call(this.target, code);
        });
    }
}

/**
 * 轴映射
 */
export class AxisMapping {
    constructor(public readonly mappingName: string, public readonly func: Func1P<number, void>, public readonly target: any) {

    }

    public execute(value: number) {
        this._value = value;
        this.func.call(this.target, this._value);
    }

    public cancel() {
        this._value = 0;
        this.func.call(this.target, this._value);
    }

    private _value = 0;
    public get value() {
        return this._value;
    }
}

/**
 * 操作映射
 */
export class ActionMapping {

    constructor(public readonly mappingName: string, public readonly func: Func<void>, public readonly target: any) {

    }

    public execute() {
        this.func.call(this.target);
    }

    public cancel() {

    }
}

/**
 * 输入系统接口
 */
export interface IInputSystem {
    /**
     * 获取键信息
     * 
     * @param keyCode 
     * @returns 
     */
    getCodePressed(keyCode: EInputCode): boolean;

    /**
     * 绑定轴输入
     * 
     * @param mappingName 映射名
     */
    bindAxis(mappingName: MappingName, func: Func1P<number, void>, target?: any): void;

    /**
     * 绑定动作输入
     * 
     * @param mappingName 映射名
     * @param func 任务
     * @param target 执行目标
     */
    bindAction(mappingName: MappingName, func: Func<void>, target?: any): void
}

/**
 * 把目标转换成 Vec3
 * 
 * @param target 目标
 * @returns Vec3
 */
export function toVec3(target: Vec2, out?: Vec3): Vec3 {
    if (!out) {
        out = v3();
    }

    out.x = target.x;
    out.y = target.y;
    return out;
}

/**
 * 把目标转换成 Vec3
 * 
 * @param target 目标
 * @returns Vec3
 */
export function toVec2(target: Vec3, out?: Vec2): Vec2 {
    if (!out) {
        out = v2();
    }

    out.x = target.x;
    out.y = target.y;
    return out;
}

/**
 * 类型转换
 * 
 * @param from 
 * @returns 
 */
export function cast<T>(from: any): T {
    return from;
}

/**
 * 映射名
 */
export type MappingName = string;

/**
 * 映射中的输入键
 */
export type MappingInputKey = string;

export type Func<TReturn> = () => TReturn;

export type Func1P<TP1, TReturn> = (p: TP1) => TReturn;