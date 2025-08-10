import "@logseq/libs"
import {createRoot} from 'react-dom/client';
import ToolbarApp from './components/ToolbarApp'
import {SettingSchemaDesc} from "@logseq/libs/dist/LSPlugin.user";
import {
    getSelectedBlocks,
    transformAction,
    changeHeadingLevel,
    exitEditingMode
} from "./block_handler";
import React from "react";

let settings: SettingSchemaDesc[] = [
    {
        key: "transformModes",
        title: "Transform Modes",
        type: "object",
        default: [
    {
      "id": 1,
      "name": "Split",
      "useSplit": true,
      "useHeader": false,
      "removeEmptyLine": true,
      "splitCodeBlock": true,
      "orderedToNonOrdered": false,
      "boldToHeader": false,
      "removeTailPunctuation": true,
      "maxHeaderLevel": 4
    },
    {
      "id": 2,
      "name": "Header",
      "useSplit": false,
      "useHeader": true,
      "removeEmptyLine": true,
      "splitCodeBlock": true,
      "orderedToNonOrdered": false,
      "boldToHeader": false,
      "removeTailPunctuation": true,
      "maxHeaderLevel": 4
    },
    {
      "id": 3,
      "name": "Split+Header",
      "useSplit": true,
      "useHeader": true,
      "removeEmptyLine": true,
      "splitCodeBlock": true,
      "orderedToNonOrdered": false,
      "boldToHeader": false,
      "removeTailPunctuation": true,
      "maxHeaderLevel": 4
    },
    {
      "id": 4,
      "name": "Full",
      "useSplit": true,
      "useHeader": true,
      "removeEmptyLine": true,
      "splitCodeBlock": true,
      "orderedToNonOrdered": true,
      "boldToHeader": true,
      "removeTailPunctuation": true,
      "maxHeaderLevel": 4
    }
  ],
        description: "Define different modes for block transformation",
    },
    {
        key: "activeModeId",
        title: "Active Mode",
        type: "number",
        default: 1,
        description: "The currently active transformation mode",
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
    },
    {
        key: "enableHeaderShortcuts",
        title: 'Enable header shortcuts (ctrl+1 to ctrl+6)',
        type: "boolean",
        default: false,
        description: 'Enable shortcuts to change heading levels. This may conflict with other plugins.'
    }
];


const model = {
    toggleBlockTransformerPanel() {
        // First, toggle the UI's visibility
        logseq.toggleMainUI();
    }
};

async function main() {
    let root = createRoot(document.getElementById('app')!);
    root.render(
        <React.StrictMode>
            <ToolbarApp />
        </React.StrictMode>
    );

    logseq.provideModel(model)

    logseq.App.registerUIItem('toolbar', {
        key: 'block-transformer-toolbar',
        template: `
            <a data-on-click="toggleBlockTransformerPanel" class="button">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-list-details" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M13 5h8" />
                  <path d="M13 9h5" />
                  <path d="M13 15h8" />
                  <path d="M13 19h5" />
                  <rect x="3" y="4" width="6" height="6" rx="1" />
                  <rect x="3" y="14" width="6" height="6" rx="1" />
                </svg>
            </a>
        `,
    });

    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformShortcut,
    }, async () => {
        await exitEditingMode();
        let selectedBlocks = await getSelectedBlocks();
        await transformAction(selectedBlocks);
    });
    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformModeShortcut,
    }, async () => {
        const currentModeId = logseq.settings?.activeModeId;
        const modes = logseq.settings?.transformModes as { id: number, name: string }[];
        const modeIds = modes.map(m => m.id);
        const currentIndex = modeIds.indexOf(currentModeId);
        const newIndex = (currentIndex + 1) % modeIds.length;
        const newModeId = modeIds[newIndex];
        const newMode = modes.find(m => m.id === newModeId);
        logseq.updateSettings({ activeModeId: newModeId });
        if (newMode) {
            await logseq.UI.showMsg(`Switched to ${newMode.name} mode`);
        }
    });

    // Register heading shortcuts
    if (logseq.settings?.enableHeaderShortcuts) {
        for (let i = 0; i <= 6; i++) {
            logseq.App.registerCommandShortcut(
                {
                    mode: 'global',
                    binding: `ctrl+${i}`,
                },
                async () => {
                    await changeHeadingLevel(i);
                }
            );
        }
    }
}

// bootstrap
logseq.useSettingsSchema(settings).ready(main).catch(console.error);
