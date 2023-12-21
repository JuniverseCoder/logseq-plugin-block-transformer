import {BlockUUID, BlockUUIDTuple} from "@logseq/libs/dist/LSPlugin";
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
    public transformMode = 'split';
    public removeEmptyLine = true;
    public splitCodeBlock = true;
    public orderedToNonOrdered = false;
    public removeTailPunctuation: boolean = true;
    public boldToHeader: boolean = false;
    public maxHeaderLevel: number = 4;
}

function camelToKebab(str: string) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function convertBlockProperties(blockProperties: Record<string, any> | undefined): Record<string, any> {
    let properties: Record<string, any> = {};
    if (blockProperties) {
        for (let propertiesKey in blockProperties) {
            properties[camelToKebab(propertiesKey)] = blockProperties[propertiesKey];
        }
    }
    return properties
}

async function splitBlocksToTree(blockEntities: BlockEntity[], transformerContext: TransformerContext): Promise<BlockTreeNode[]> {
    let outputBlockTreeNodes: BlockTreeNode[] = [];

    function appendNewBlockTreeNode(blockTreeNode: BlockTreeNode, is_first: boolean, blockEntity: BlockEntity, lastBlockTreeNodes: BlockTreeNode[]) {
        if (is_first) {
            is_first = false;
            blockTreeNode.refBlock = blockEntity;
            // inherent refBlock properties
            blockTreeNode.properties = convertBlockProperties(blockEntity.properties);
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
        let lines = getContent(blockEntity).split(/\r\n|\n|\r/);


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
            // filter collapsed property line
            if (line.startsWith("collapsed:: ")) {
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
                    content: line.replace(/^\s*[0-9]+[.、．]\s*/, ''),
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

async function getHeaderLevelByParent(blockEntity: BlockEntity): Promise<number> {
    let headerLevel = 1;
    let currentBlockEntity = blockEntity;
    while (currentBlockEntity.parent) {
        let parentBlockEntity = await logseq.Editor.getBlock(currentBlockEntity.parent.id);
        if (!parentBlockEntity) {
            return headerLevel;
        }
        let match = parentBlockEntity.content.match(/^(#+)\s/);
        if (match) {
            headerLevel = match[1].length + 1;
            return headerLevel;
        }
        currentBlockEntity = parentBlockEntity;
    }
    return headerLevel;
}

function getContent(blockEntity: BlockEntity) {
    if (!blockEntity.properties) {
        return blockEntity.content
    }
    // let propertiesLines: string[] = []
    // Object.entries(blockEntity.properties).forEach(([key, value]) => {
    //     propertiesLines.push(camelToKebab(key) + ':: ')
    // })
    let lines = blockEntity.content.split(/\r\n|\n|\r/);
    // exclude properties lines by prefix
    lines = lines.filter(line =>
        !/^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*:: /i.test(line)
    );
    console.log(lines)
    return lines.join('\n')
}


async function headerModeAction(blockEntities: BlockEntity[], transformerContext: TransformerContext, headerLevel = -1) {
    for (let blockEntity of blockEntities) {
        if (headerLevel < 0) {
            headerLevel = await getHeaderLevelByParent(blockEntity);
        }
        headerLevel = Math.min(headerLevel, transformerContext.maxHeaderLevel);

        // is header
        let content = getContent(blockEntity);
        let is_header = !/[\r\n]/.test(content) && /^\s*#+\s/.test(content);
        let is_bold_header = transformerContext.boldToHeader && !/[\r\n]/.test(content) && /^\s*\*\*.*\*\*[,.:;!?:\s，。：；！？：]*$/.test(content)
        if (is_header || is_bold_header) {
            let newContent = content;
            newContent = newContent.replace(/^\s*#+\s/, "");
            newContent = newContent.replace(/^\s*\*\*(.*)\*\*/, "$1");

            // remove tail punctuation
            if (transformerContext.removeTailPunctuation) {
                newContent = newContent.replace(/[,.:;!?:\s，。：；！？：]*$/, "");
            }
            // add header by header level
            newContent = " " + newContent.trim();
            for (let i = 0; i < headerLevel; i++) {
                newContent = '#' + newContent;
            }
            if (content !== newContent) {
                await logseq.Editor.updateBlock(blockEntity.uuid, newContent, {properties: convertBlockProperties(blockEntity.properties)});
            }
        }
        let children = await getBlockEntityChildren(blockEntity);
        await headerModeAction(children, transformerContext, headerLevel + 1);
    }
    return blockEntities;
}


async function modifyBlockAsTree(originBlocks: BlockEntity[], blockTreeNodes: BlockTreeNode[]) {
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
            console.log("delete block", originBlock)
            await logseq.Editor.removeBlock(originBlock.uuid);
        } else {
            await modifyBlockAsTreeDeleteHelper(originBlock, visitContext);
        }
    }
    let newSelectedBlockEntity = [];
    for (let blockTreeNode of blockTreeNodes) {
        if (blockTreeNode.refBlock) {
            newSelectedBlockEntity.push(blockTreeNode.refBlock);
        }
    }
    return newSelectedBlockEntity;
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
    blockTreeNode.refBlock = current_block;
}

async function modifyBlockAsTreeDeleteHelper(blockEntity: BlockEntity, visitContext: VisitContext) {
    // delete block
    if (!visitContext.visitedBlockUuids.has(blockEntity.uuid)) {
        console.log("delete block", blockEntity)
        await logseq.Editor.removeBlock(blockEntity.uuid);
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

async function optimizeSelectedBlocks(originSelectedBlocks: Array<BlockEntity> | null) {
    let selectedBlocks: BlockEntity[] = [];
    if (originSelectedBlocks && originSelectedBlocks.length > 0) {
        let visitSet = new Set<string>();
        // construct tree
        for (let blockEntity of originSelectedBlocks) {
            let newBlockEntity = await logseq.Editor.getBlock(blockEntity.id);
            newBlockEntity = await buildBlockEntityTree(blockEntity, visitSet);
            if (newBlockEntity) {
                selectedBlocks.push(newBlockEntity);
            }
        }
    }
    return selectedBlocks;
}

export async function getSelectedBlocks() {
    // exit editing mode
    // editing mode modify block have bug:cannot update when cursor is at the end
    let isEditing = await logseq.Editor.checkEditing();
    if (isEditing) {
        await logseq.Editor.exitEditingMode(true);
        // sleep to prevent ui bug
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const originSelectedBlocks = await logseq.Editor.getSelectedBlocks();
    console.log(originSelectedBlocks)
    return await optimizeSelectedBlocks(originSelectedBlocks);
}

function getBlockEntityUUID(blockEntity: BlockEntity | BlockUUIDTuple): BlockUUID {
    // 检查 blockEntity 是否为 BlockEntity 类型
    if ('uuid' in blockEntity) {
        // 如果是 BlockEntity 类型，直接返回 uuid
        return blockEntity.uuid;
    } else {
        // 否则，blockEntity 应该是 BlockUUIDTuple 类型
        // 返回元组的第二个元素，即 uuid
        return blockEntity[1];
    }
}

async function buildBlockEntityTree(blockEntity: BlockEntity | BlockUUIDTuple, visitSet: Set<String>): Promise<BlockEntity | null> {
    let newBlockEntity = await logseq.Editor.getBlock(getBlockEntityUUID(blockEntity));
    console.log(newBlockEntity)
    if (!newBlockEntity || visitSet.has(newBlockEntity.uuid)) {
        return null;
    }
    visitSet.add(newBlockEntity.uuid);
    let newChildren = [];
    if (newBlockEntity.children) {
        for (let child of newBlockEntity.children) {
            let newChild = await buildBlockEntityTree(child, visitSet);
            if (newChild) {
                newChildren.push(newChild);
            }
        }
    }
    newBlockEntity.children = newChildren;
    return newBlockEntity;
}

async function splitModeAction(selectedBlockEntities: BlockEntity[], transformerContext: TransformerContext) {
    let blockTreeNodes = await splitBlocksToTree(selectedBlockEntities, transformerContext)
    return await modifyBlockAsTree(selectedBlockEntities, blockTreeNodes);
}

export async function transformAction(selectedBlockEntities: BlockEntity[]) {
    await logseq.UI.showMsg('start block transformer in transformMode: ' + logseq.settings?.transformMode)
    let transformerContext = new TransformerContext();
    transformerContext.transformMode = logseq.settings?.transformMode;
    transformerContext.splitCodeBlock = logseq.settings?.splitCodeBlock;
    transformerContext.removeEmptyLine = logseq.settings?.removeEmptyLine;
    transformerContext.orderedToNonOrdered = logseq.settings?.orderedToNonOrdered;
    transformerContext.removeTailPunctuation = logseq.settings?.removeTailPunctuation;
    transformerContext.boldToHeader = logseq.settings?.boldToHeader;
    transformerContext.maxHeaderLevel = logseq.settings?.maxHeaderLevel;

    console.log("selectedBlockEntities", selectedBlockEntities)

    switch (transformerContext.transformMode) {
        case 'split':
            await splitModeAction(selectedBlockEntities, transformerContext);
            break;
        case 'header':
            await headerModeAction(selectedBlockEntities, transformerContext)
            break;
        case 'split+header':
            selectedBlockEntities = await splitModeAction(selectedBlockEntities, transformerContext);
            selectedBlockEntities = await optimizeSelectedBlocks(selectedBlockEntities);
            await headerModeAction(selectedBlockEntities, transformerContext)
            break;
        default:
            break;
    }
}
