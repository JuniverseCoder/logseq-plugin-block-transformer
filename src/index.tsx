import "@logseq/libs"
import {createRoot} from 'react-dom/client';
import App from './components/App'
import {BlockEntity, SettingSchemaDesc} from "@logseq/libs/dist/LSPlugin.user";
import {
    getSelectedBlocks,
    modifyBlockAsTree,
    transformAction,
    transformBlocksToTree,
    TransformerContext
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
        key: "transformShortcut",
        title: 'Keyboard shortcut to transform block',
        type: "string",
        default: "ctrl+t",
        description: ''
    }
];


async function main() {
    // let root = createRoot(document.getElementById('app')!);


    async function transformToolbox() {
        let selectedBlocks = await getSelectedBlocks();
        await transformAction(selectedBlocks);
        // root.render(<React.StrictMode>
        //     <App selectedBlocks={selectedBlocks}/>
        // </React.StrictMode>);
        // logseq.showMainUI()
    }

    function createModel() {
        return {
            transformAction, transformToolbox
        };
    }

    logseq.provideModel(createModel());
    const triggerIconName = "ti-transform";

    logseq.App.registerUIItem("toolbar", {
        key: "transformer-plugin-button",
        template: `
    <a class="button" data-on-click="transformToolbox" data-rect>
      <i class="ti ${triggerIconName}"></i>
    </a>
  `
    });
    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformShortcut,
    }, async () => {
        let selectedBlocks = await getSelectedBlocks();
        await transformAction(selectedBlocks);
    })
}

// bootstrap
logseq.useSettingsSchema(settings).ready(main).catch(console.error);
