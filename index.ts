import "@logseq/libs"
import {BlockEntity, SettingSchemaDesc} from "@logseq/libs/dist/LSPlugin.user";
import {modifyBlockAsTree, transformBlocksToTree, TransformerContext} from "./block_handler";

const settings: SettingSchemaDesc[] = [
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
    async function transformAction() {
        await logseq.UI.showMsg('start block transformer')
        let transformerContext = new TransformerContext();
        transformerContext.transformAction = 'split'
        transformerContext.splitCodeBlock = logseq.settings?.splitCodeBlock;
        transformerContext.removeEmptyLine = logseq.settings?.removeEmptyLine;

        // exit editing mode
        // editing mode modify block have bug:cannot update when cursor is at the end
        let isEditing = await logseq.Editor.checkEditing();
        if (isEditing) {
            await logseq.Editor.exitEditingMode(true);
            // sleep to prevent ui bug
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const selected = await logseq.Editor.getSelectedBlocks();
        console.log(selected)
        let originBlocks: BlockEntity[] = [];
        if (selected && selected.length > 0) {
            // construct tree
            let blockMap: Map<number, BlockEntity> = new Map<number, BlockEntity>();
            for (let blockEntity of selected) {
                if (blockMap.has(blockEntity.parent.id)) {
                    let parentBlockEntity = blockMap.get(blockEntity.parent.id);
                    if (parentBlockEntity) {
                        if (!parentBlockEntity.children) {
                            parentBlockEntity.children = [];
                        }
                        parentBlockEntity.children.push(blockEntity)
                        blockMap.set(blockEntity.id, blockEntity);
                    }
                } else {
                    blockMap.set(blockEntity.id, blockEntity);
                    originBlocks.push(blockEntity)
                }
            }
        }
        let blockTreeNodes = await transformBlocksToTree(originBlocks, transformerContext);
        console.log(blockTreeNodes);
        console.log(originBlocks);
        await modifyBlockAsTree(originBlocks, blockTreeNodes);
    }

    function createModel() {
        return {
            transformAction
        };
    }

    logseq.provideModel(createModel());
    const triggerIconName = "ti-transform";

    logseq.App.registerUIItem("toolbar", {
        key: "transformer-plugin-button",
        template: `
    <a class="button" data-on-click="transformAction" data-rect>
      <i class="ti ${triggerIconName}"></i>
    </a>
  `
    });
    logseq.App.registerCommandShortcut({
        mode: 'global',
        binding: logseq.settings?.transformShortcut,
    }, async () => {
        await transformAction();
    })
}

// bootstrap
logseq.useSettingsSchema(settings).ready(main).catch(console.error)
