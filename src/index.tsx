import "@logseq/libs"
import {createRoot} from 'react-dom/client';
import App from './components/App'
import {SettingSchemaDesc} from "@logseq/libs/dist/LSPlugin.user";
import {
    getSelectedBlocks,
    transformAction
} from "./block_handler";
import React from "react";

let settings: SettingSchemaDesc[] = [
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
        key: "transformShortcut",
        title: 'Keyboard shortcut to transform block',
        type: "string",
        default: "ctrl+t",
        description: ''
    },
    {
        key: "transformToolboxShortcut",
        title: 'Keyboard shortcut to transform toolbox',
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
        binding: logseq.settings?.transformToolboxShortcut,
    }, async () => {
        let selectedBlocks = await getSelectedBlocks();
        root.render(<React.StrictMode>
            <App selectedBlocks={selectedBlocks}/>
        </React.StrictMode>);
        logseq.showMainUI()
    });
}

// bootstrap
logseq.useSettingsSchema(settings).ready(main).catch(console.error);
