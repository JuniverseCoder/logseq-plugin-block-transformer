import React from "react";
import {Button} from 'antd';
import {Col, Divider, Row} from 'antd';
import {transformAction} from "../block_handler";
import {BlockEntity} from "@logseq/libs/dist/LSPlugin.user";

const style: React.CSSProperties = {background: '#0092ff', padding: '8px 0'};
const rowSpan = 6;
const buttonSpan = 6;
const divStyle = {display: 'flex', "flex-direction": 'column'};

interface AppProps {
    selectedBlocks: BlockEntity[]
}

let App: React.FC<AppProps> = (props) => {
    return <div style={divStyle}>
        <Row gutter={rowSpan}>
            <Col className="gutter-row" span={buttonSpan}>
                <Button className="transform_button" type="primary" onClick={
                    () => {
                        logseq.hideMainUI()
                        transformAction(props.selectedBlocks)
                    }
                }><span className="underline-and-enlarge">T</span>ransform block</Button>
            </Col>
        </Row>
        <Row gutter={rowSpan}>
            <Col className="gutter-row" span={buttonSpan}>
                <Button className="transform_button" type="primary" onClick={
                    () => {
                        logseq.hideMainUI()
                    }
                }> turn to <span className="underline-and-enlarge">P</span>age </Button>
            </Col>
        </Row>
        <Row gutter={rowSpan}>
            <Col className="gutter-row" span={buttonSpan}>
                <Button className="transform_button" type="primary" onClick={
                    () => {
                        logseq.hideMainUI()
                    }
                }> <span className="underline-and-enlarge">Q</span>uit </Button>
            </Col>
        </Row>
    </div>
        ;
};
export default App;