import {BlockUUID} from "@logseq/libs/dist/LSPlugin";
import {BlockEntity} from "@logseq/libs/dist/LSPlugin.user";
import {isEqual} from 'lodash';

class BlockTreeNode {
    public refBlock: BlockEntity | undefined;
    public children: BlockTreeNode[] = [];
    public content: string = "";
    public properties: Record<string, any> = {};
    public blankLevel = 0;
}

class VisitContext {
    public parentBlock: BlockEntity | undefined;
    public lastVisitedBlock: BlockEntity | undefined;
    public visitedBlockUuids: Set<BlockUUID> = new Set();
}


export class TransformerContext {
    public transformAction = '';
    public removeEmptyLine = true;
    public splitCodeBlock = true;
    public orderedToNonOrdered = false;
}

function camelToKebab(str: string) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export async function transformBlocksToTree(blockEntities: BlockEntity[], transformerContext: TransformerContext): Promise<BlockTreeNode[]> {
    switch (transformerContext.transformAction) {
        case 'split':
            return await splitBlocksToTree(blockEntities, transformerContext)
        default:
            return []
    }
}

export async function splitBlocksToTree(blockEntities: BlockEntity[], transformerContext: TransformerContext): Promise<BlockTreeNode[]> {
    let outputBlockTreeNodes: BlockTreeNode[] = [];

    function appendNewBlockTreeNode(blockTreeNode: BlockTreeNode, is_first: boolean, blockEntity: BlockEntity, lastBlockTreeNodes: BlockTreeNode[]) {
        if (is_first) {
            is_first = false;
            blockTreeNode.refBlock = blockEntity;
            // inherent refBlock properties
            if (blockEntity.properties) {
                for (let propertiesKey in blockEntity.properties) {
                    blockTreeNode.properties[camelToKebab(propertiesKey)] = blockEntity.properties[propertiesKey];
                }
            }
        }
        // remove lower blank level
        for (let j = lastBlockTreeNodes.length - 1; j >= 0; j--) {
            if (lastBlockTreeNodes[j].blankLevel >= blockTreeNode.blankLevel) {
                lastBlockTreeNodes.pop();
            }
        }
        if (lastBlockTreeNodes.length == 0) {
            // append output
            outputBlockTreeNodes.push(blockTreeNode);
            lastBlockTreeNodes.push(blockTreeNode);
        } else {
            // append children
            lastBlockTreeNodes[lastBlockTreeNodes.length - 1].children.push(blockTreeNode)
            lastBlockTreeNodes.push(blockTreeNode);
        }
        return is_first;
    }

    for (let blockEntity of blockEntities) {
        let is_first = true;
        let lastBlockTreeNodes: BlockTreeNode[] = [];
        let lines = blockEntity.content.split(/\r\n|\n|\r/);
        let propertyStringSet: Set<string> = new Set();
        if (blockEntity.properties) {
            for (let propertiesKey in blockEntity.properties) {
                propertyStringSet.add(`${camelToKebab(propertiesKey)}:: ${blockEntity.properties[propertiesKey]}`)
            }
        }


        let completeCodeBlock = true;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let blankLevel = 0;
            let blankNum = 0;
            // find blank len
            for (let j = 0; j < line.length; j++) {
                if (line[j] === ' ') {
                    blankNum += 1;
                    blankLevel += 1;
                } else if (line[j] === '\t') {
                    blankNum += 1;
                    // one tab equal four spaces
                    blankLevel += 4;
                } else {
                    break
                }
            }
            // filter empty line
            if (blankNum == line.length && transformerContext.removeEmptyLine) {
                continue;
            }
            // filter property line
            if (propertyStringSet.has(line)) {
                continue;
            }


            // handle lines
            // handle table
            if (line[blankNum] === '|') {
                let combineTable = false;
                if (lastBlockTreeNodes.length > 0) {
                    let lastNodeTrim = lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content.trim();
                    if (lastNodeTrim.length > 0 && lastNodeTrim[0] === '|') {
                        lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content += '\n' + line;
                        combineTable = true;
                    }
                }
                if (!combineTable) {
                    let blockTreeNode = {
                        refBlock: undefined,
                        content: line,
                        children: [],
                        properties: {},
                        blankLevel: blankLevel
                    }
                    is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
                }
            } else if (!completeCodeBlock) {
                const position = line.indexOf('```')
                if (position >= 0) {
                    lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content += '\n' + line.substring(0, position + 3)


                    // remove heading blank
                    let blockLines = lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content.split('\n');
                    // get the min blank num
                    let minBlankNum = blockLines.length;
                    for (let j = 1; j < blockLines.length - 1; j++) {
                        let blockLine = blockLines[j];
                        let blankNum = 0;
                        for (let k = 0; k < blockLine.length; k++) {
                            if (blockLine[k] === ' ' || blockLine[k] === '\t') {
                                blankNum += 1;
                            } else {
                                break;
                            }
                        }
                        minBlankNum = Math.min(minBlankNum, blankNum);
                    }
                    // handle remove heading blank
                    let content = '';
                    for (let j = 0; j < blockLines.length; j++) {
                        if (j == 0) {
                            content += blockLines[j].trim();
                        } else if (j == blockLines.length - 1) {
                            content += '\n' + blockLines[j].trim();
                        } else {
                            content += '\n' + blockLines[j].substring(minBlankNum)
                        }
                    }
                    lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content = content;


                    blankLevel = lastBlockTreeNodes[lastBlockTreeNodes.length - 1].blankLevel
                    let line1 = line.substring(position + 3);
                    if (line1.trim().length > 0) {
                        let blockTreeNode = {
                            refBlock: undefined,
                            content: line1,
                            children: [],
                            properties: {},
                            blankLevel: blankLevel
                        }
                        is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
                    }
                    completeCodeBlock = true;
                } else {
                    lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content += '\n' + line
                }
            } else if (line.substring(blankNum, blankNum + 3) === '```') {
                completeCodeBlock = false;
                if (!transformerContext.splitCodeBlock) {
                    lastBlockTreeNodes[lastBlockTreeNodes.length - 1].content += '\n' + line
                } else {
                    let blockTreeNode = {
                        refBlock: undefined,
                        content: line,
                        children: [],
                        properties: {},
                        blankLevel: blankLevel
                    }
                    is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
                }
            }
            // handle order list
            else if (/^\s*[0-9]+[.、．]\s*/.test(line)) {
                let blockProperties: { [key: string]: string } = {};
                if (!transformerContext.orderedToNonOrdered) {
                    blockProperties['logseq.order-list-type'] = 'number';
                }
                let blockTreeNode = {
                    refBlock: undefined,
                    content: line.replace(/^\s*[0-9]+\.\s/, ''),
                    children: [],
                    properties: blockProperties,
                    blankLevel: blankLevel
                };
                is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
            }
            // handle normal list
            else if (/^\s*-\s/.test(line)) {
                let blockTreeNode = {
                    refBlock: undefined,
                    content: line.replace(/^\s*-\s/, ''),
                    children: [],
                    properties: {},
                    blankLevel: blankLevel
                };
                is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
            }
            // handle normal line
            else {
                let blockTreeNode = {
                    refBlock: undefined,
                    content: line,
                    children: [],
                    properties: {},
                    blankLevel: blankLevel
                };
                is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
            }
        }
        // append empty line for empty result
        if (outputBlockTreeNodes.length == 0) {
            let blockTreeNode = {
                refBlock: undefined,
                content: '',
                children: [],
                properties: {},
                blankLevel: 0
            }
            is_first = appendNewBlockTreeNode(blockTreeNode, is_first, blockEntity, lastBlockTreeNodes);
        }
        let children = await getBlockEntityChildren(blockEntity);
        let childBlockTreeNodes = await splitBlocksToTree(children, transformerContext);
        for (let childBlockTreeNode of childBlockTreeNodes) {
            lastBlockTreeNodes[0].children.push(childBlockTreeNode)
        }
    }
    return outputBlockTreeNodes;
}

export async function modifyBlockAsTree(originBlocks: BlockEntity[], blockTreeNodes: BlockTreeNode[]) {
    let visitContext: VisitContext = {
        parentBlock: undefined,
        lastVisitedBlock: undefined,
        visitedBlockUuids: new Set()
    }
    for (let blockTreeNode of blockTreeNodes) {
        await modifyBlockAsTreeModifyHelper(blockTreeNode, visitContext);
    }
    // delete unvisited blocks
    for (let originBlock of originBlocks) {
        if (!visitContext.visitedBlockUuids.has(originBlock.uuid)) {
            await logseq.Editor.deleteBlock(originBlock.uuid);
        } else {
            await modifyBlockAsTreeDeleteHelper(originBlock, visitContext);
        }
    }

}

async function modifyBlockAsTreeModifyHelper(blockTreeNode: BlockTreeNode, visitContext: VisitContext) {
    let current_block: BlockEntity | undefined = undefined;
    // insert empty block
    if (blockTreeNode.refBlock === undefined && visitContext.lastVisitedBlock?.uuid) {
        let newBlock = await logseq.Editor.insertBlock(visitContext.lastVisitedBlock?.uuid, blockTreeNode.content, {
            sibling: visitContext.lastVisitedBlock?.uuid !== visitContext.parentBlock?.uuid,
            properties: blockTreeNode.properties
        }) || undefined;
        blockTreeNode.refBlock = newBlock?.uuid && await logseq.Editor.getBlock(newBlock.uuid) || undefined;
        console.debug("blockTreeNode.refBlock", blockTreeNode.refBlock)
    }

    // move and update block
    if (blockTreeNode.refBlock?.uuid !== undefined) {
        // move block to right position
        // if parentBlock undefined,update
        // if parentBlock defined,move if parent id or left id not equal
        if (visitContext.parentBlock !== undefined && (visitContext.parentBlock.id !== blockTreeNode.refBlock?.id || visitContext.lastVisitedBlock?.id !== blockTreeNode.refBlock?.left.id)) {
            // @ts-ignore
            await logseq.Editor.moveBlock(blockTreeNode.refBlock?.uuid, visitContext.lastVisitedBlock?.uuid, {
                    children: visitContext.lastVisitedBlock?.uuid === visitContext.parentBlock.uuid,
                    before: false
                }
            );
        }
        // update block content and properties
        if (blockTreeNode.refBlock.content !== blockTreeNode.content || !isEqual(blockTreeNode.refBlock.properties, blockTreeNode.properties)) {
            console.debug("update block", blockTreeNode.refBlock, blockTreeNode.content, blockTreeNode.properties)
            await logseq.Editor.updateBlock(blockTreeNode.refBlock?.uuid, blockTreeNode.content, {properties: blockTreeNode.properties});
        }
        current_block = await logseq.Editor.getBlock(blockTreeNode.refBlock?.uuid) || undefined;
        console.log(current_block?.content)
    }

    if (current_block?.uuid) {
        visitContext.visitedBlockUuids.add(current_block?.uuid);
    }
    visitContext.lastVisitedBlock = current_block;
    let lastParentBlock = visitContext.parentBlock;
    visitContext.parentBlock = current_block;
    for (let child of blockTreeNode.children) {
        await modifyBlockAsTreeModifyHelper(child, visitContext);
    }
    visitContext.parentBlock = lastParentBlock;
    visitContext.lastVisitedBlock = current_block;
}

async function modifyBlockAsTreeDeleteHelper(blockEntity: BlockEntity, visitContext: VisitContext) {
    // delete block
    if (!visitContext.visitedBlockUuids.has(blockEntity.uuid)) {
        await logseq.Editor.deleteBlock(blockEntity.uuid);
    }
    let children = await getBlockEntityChildren(blockEntity);
    for (let child of children) {
        await modifyBlockAsTreeDeleteHelper(child, visitContext);
    }
}

async function getBlockEntityChildren(blockEntity: BlockEntity): Promise<BlockEntity[]> {
    let children: BlockEntity[] = [];
    if (blockEntity.children) {
        for (let child of blockEntity.children) {
            // @ts-ignore
            children.push(child)
        }
    }
    return children
}

export async function getSelectedBlocks() {
    // exit editing mode
    // editing mode modify block have bug:cannot update when cursor is at the end
    let isEditing = await logseq.Editor.checkEditing();
    console.log(isEditing)
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
    return originBlocks;
}

export async function transformAction(originBlocks: BlockEntity[]) {
    await logseq.UI.showMsg('start block transformer')
    let transformerContext = new TransformerContext();
    transformerContext.transformAction = 'split'
    transformerContext.splitCodeBlock = logseq.settings?.splitCodeBlock;
    transformerContext.removeEmptyLine = logseq.settings?.removeEmptyLine;

    let blockTreeNodes = await transformBlocksToTree(originBlocks, transformerContext);
    console.log(blockTreeNodes);
    console.log(originBlocks);
    await modifyBlockAsTree(originBlocks, blockTreeNodes);
}