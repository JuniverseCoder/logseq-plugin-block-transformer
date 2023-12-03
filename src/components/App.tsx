import React from "react";
import {Button} from 'antd';
import {transformAction} from "../block_handler";
import {BlockEntity} from "@logseq/libs/dist/LSPlugin.user";

const divStyle = {display: 'flex', "flex-direction": 'row'};

interface AppProps {
    selectedBlocks: BlockEntity[]
}

let App: React.FC<AppProps> = (props) => {
    return <div style={divStyle}>
        <Button className="transform_button" type="primary" onClick={
            () => {
                logseq.hideMainUI()
                transformAction(props.selectedBlocks)
            }
        }><span className="underline-and-enlarge">T</span>ransform block</Button>
        <Button className="transform_button" type="primary" onClick={
            () => {
                logseq.hideMainUI()
                transformAction(props.selectedBlocks)
            }
        }><span className="underline-and-enlarge">H</span>eader</Button>
        {/*<Button className="transform_button" type="primary" onClick={*/}
        {/*    () => {*/}
        {/*        logseq.hideMainUI()*/}
        {/*    }*/}
        {/*}> turn to <span className="underline-and-enlarge">P</span>age </Button>*/}
        <Button className="transform_button" type="primary" onClick={
            () => {
                logseq.hideMainUI()
            }
        }> <span className="underline-and-enlarge">Q</span>uit </Button>
    </div>
        ;
};
export default App;