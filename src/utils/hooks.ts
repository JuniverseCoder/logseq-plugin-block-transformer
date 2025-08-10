import {useEffect, useState} from "react";

export const useAppVisible = () => {
    const [visible, setVisible] = useState(logseq.isMainUIVisible)
    const showMainUI = () => {
        logseq.showMainUI()
    }
    useEffect(() => {
        const eventName = 'ui:visible:changed'
        const handler = async ({visible}: any) => {
            setVisible(visible)
        }
        logseq.on(eventName, handler)
        return () => {
            logseq.off(eventName, handler)
        }
    }, []);
    return {
        visible,
        showMainUI
    }
}
import {TransformMode} from "../block_handler";

export const useTransformModes = () => {
    const [modes, setModes] = useState(logseq.settings?.transformModes || []);

    useEffect(() => {
        const eventName = 'settings:changed';
        const handler = (newSettings: { transformModes: TransformMode[] }) => {
            if (newSettings.transformModes) {
                setModes(newSettings.transformModes);
            }
        };
        logseq.on(eventName, handler);
        return () => {
            logseq.off(eventName, handler);
        };
    }, []);

    return modes;
};