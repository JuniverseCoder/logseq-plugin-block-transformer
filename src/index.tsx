import "@logseq/libs"
import {createRoot} from 'react-dom/client';
import App from './components/App'
import {SettingSchemaDesc} from "@logseq/libs/dist/LSPlugin.user";
import {
    getSelectedBlocks,
    transformAction
} from "./block_handler";
import React from "react";

let transformMode = ["split", "header", "split+header"];
let settings: SettingSchemaDesc[] = [
    {
        key: "transformMode",
        title: 'Transform mode',
        type: "enum",
        enumChoices: transformMode,
        default: "split",
        description: ''
    },
    {
        key: "removeEmptyLine",
        title: 'Whether to remove empty line',
        type: "boolean",
        default: true,
        description: ''
    },
    {
        key: "splitCodeBlock",
        title: 'Whether to split code block',
        type: "boolean",
        default: true,
        description: ''
    },
    {
        key: "orderedToNonOrdered",
        title: 'Whether to convert ordered list to non-ordered list',
        type: "boolean",
        default: false,
        description: ''
    },
    {
        key: "removeTailPunctuation",
        title: 'remove tailing punctuation marks in header',
        type: "boolean",
        default: true,
        description: ''
    },
    {
        key: "transformShortcut",
        title: 'Keyboard shortcut to transform block',
        type: "string",
        default: "ctrl+t",
        description: ''
    },
    {
        key: "transformModeShortcut",
        title: 'Keyboard shortcut to switch transform mode',
        type: "string",
        default: "ctrl+shift+t",
        description: ''
    }
];


async function main() {
    let root = createRoot(document.getElementById('app')!);

    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformShortcut,
    }, async () => {
        let selectedBlocks = await getSelectedBlocks();
        await transformAction(selectedBlocks);
    });
    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformModeShortcut,
    }, async () => {
        let currentMode = logseq.settings?.transformMode;
        let newMode = transformMode[(transformMode.indexOf(currentMode) + 1) % transformMode.length];
        logseq.updateSettings({"transformMode": newMode})
        await logseq.UI.showMsg(`Switched to ${newMode} mode`);
    });
}

// bootstrap
logseq.useSettingsSchema(settings).ready(main).catch(console.error);
