import React, {useEffect, useRef, useState} from "react";
import './ToolbarApp.css'
import {useAppVisible, useTransformModes} from "../utils/hooks";
import {Button, Checkbox, Form, Input, Popconfirm, Radio, Table, Typography} from "antd";
import {TransformMode} from "../block_handler";

const ToolbarApp = () => {
    const innerRef = useRef<HTMLDivElement>(null);
    const {visible} = useAppVisible()
    const [form] = Form.useForm();
    const transformModes = useTransformModes();
    const [editingKey, setEditingKey] = useState(0);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (innerRef.current && !innerRef.current.contains(event.target as Node)) {
                logseq.hideMainUI()
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [innerRef]);

    const updateSettings = (newModes: TransformMode[]) => {
        logseq.updateSettings({transformModes: newModes})
    }

    const handleModeChange = (value: number) => {
        logseq.updateSettings({activeModeId: value})
    }


    const isEditing = (record: TransformMode) => record.id === editingKey;

    const edit = (record: Partial<TransformMode> & { id: number }) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.id);
    };

    const cancel = () => {
        setEditingKey(0);
    };

    const save = async (id: number) => {
        try {
            const row = (await form.validateFields()) as TransformMode;
            const currentModes = transformModes || []
            const newData = [...currentModes];
            const index = newData.findIndex((item) => id === item.id);
            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, {
                    ...item,
                    ...row,
                });
                updateSettings(newData);
                setEditingKey(0);
            } else {
                newData.push(row);
                updateSettings(newData);
                setEditingKey(0);
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleDelete = (id: number) => {
        const currentModes = transformModes || []
        if (currentModes.length <= 1) {
            logseq.UI.showMsg("Cannot delete the last mode.", "warning");
            return;
        }

        if (logseq.settings?.activeModeId === id) {
            logseq.UI.showMsg("Cannot delete active mode", "warning")
            return;
        }

        const newData = currentModes.filter((item: TransformMode) => item.id !== id);
        updateSettings(newData);
    };

    const handleAdd = () => {
        const currentModes = transformModes || []
        const existingNumbers = currentModes
            .map((mode: TransformMode) => {
                const match = mode.name.match(/^New Mode (\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter((num: number) => num > 0);

        const newNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

        const newId = currentModes.length > 0 ? Math.max(...currentModes.map((m: TransformMode) => m.id)) + 1 : 1;
        const newData: TransformMode = {
            id: newId,
            name: `New Mode ${newNumber}`,
            useSplit: true,
            useHeader: false,
            removeEmptyLine: true,
            splitCodeBlock: true,
            orderedToNonOrdered: false,
            boldToHeader: false,
            removeTailPunctuation: true,
            maxHeaderLevel: 4,
        };
        updateSettings([...currentModes, newData]);
    };

    const columns = [
        {
            title: 'Active',
            dataIndex: 'active',
            width: '5%',
            render: (_: any, record: TransformMode) => {
                return (
                    <Radio
                        checked={record.id === logseq.settings?.activeModeId}
                        onChange={() => handleModeChange(record.id)}
                    />
                );
            },
        },
        {
            title: 'Name',
            dataIndex: 'name',
            width: '15%',
            editable: true,
        },
        {
            title: 'Use Split',
            dataIndex: 'useSplit',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="useSplit" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.useSplit} disabled />
                );
            },
        },
        {
            title: 'Use Header',
            dataIndex: 'useHeader',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="useHeader" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.useHeader} disabled />
                );
            },
        },
        {
            title: 'Remove Empty Line',
            dataIndex: 'removeEmptyLine',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="removeEmptyLine" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.removeEmptyLine} disabled />
                );
            },
        },
        {
            title: 'Split Code Block',
            dataIndex: 'splitCodeBlock',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="splitCodeBlock" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.splitCodeBlock} disabled />
                );
            },
        },
        {
            title: 'Ordered to Non-Ordered',
            dataIndex: 'orderedToNonOrdered',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="orderedToNonOrdered" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.orderedToNonOrdered} disabled />
                );
            },
        },
        {
            title: 'Bold to Header',
            dataIndex: 'boldToHeader',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="boldToHeader" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.boldToHeader} disabled />
                );
            },
        },
        {
            title: 'Remove Tail Punctuation',
            dataIndex: 'removeTailPunctuation',
            width: '8%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form.Item name="removeTailPunctuation" valuePropName="checked" style={{ margin: 0 }}>
                        <Checkbox />
                    </Form.Item>
                ) : (
                    <Checkbox checked={record.removeTailPunctuation} disabled />
                );
            },
        },
        {
            title: 'Max Header Level',
            dataIndex: 'maxHeaderLevel',
            width: '8%',
            editable: true,
        },
        {
            title: 'Operation',
            dataIndex: 'operation',
            width: '18%',
            render: (_: any, record: TransformMode) => {
                const editable = isEditing(record);
                return editable ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={() => save(record.id)} type="primary">
                            Save
                        </Button>
                        <Button onClick={cancel}>Cancel</Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button disabled={editingKey !== 0} onClick={() => edit(record)}>
                            Edit
                        </Button>
                        <Button onClick={() => handleDelete(record.id)} danger>
                            Delete
                        </Button>
                    </div>
                );
            },
        },
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }
        return {
            ...col,
            onCell: (record: TransformMode) => ({
                record,
                inputType: col.dataIndex === 'maxHeaderLevel' ? 'number' : 'text',
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
            }),
        };
    });

    if (visible) {
        console.log('[faiz:] render app', visible)
        return (
            <div
                ref={innerRef}
                className="block-transformer-main-container"
                style={{
                    position: 'absolute',
                    zIndex: 1000,
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}
            >
                <Form form={form} component={false}>
                    <Table
                        components={{
                            body: {
                                cell: EditableCell,
                            },
                        }}
                        bordered
                        dataSource={transformModes || []}
                        columns={mergedColumns}
                        rowClassName="editable-row"
                        pagination={false}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 16 }}>
                        <Button onClick={handleAdd} type="primary">
                            Add a mode
                        </Button>
                    </div>
                </Form>
            </div>
        )
    }
    return null
}

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: any;
    inputType: 'number' | 'text';
    record: TransformMode;
    index: number;
    children: React.ReactNode;
}

const EditableCell: React.FC<EditableCellProps> = ({
                                                       editing,
                                                       dataIndex,
                                                       title,
                                                       inputType,
                                                       record,
                                                       index,
                                                       children,
                                                       ...restProps
                                                   }) => {
    const inputNode = inputType === 'number' ? <Input type="number" /> : <Input />;

    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={[
                        {
                            required: true,
                            message: `Please Input ${title}!`,
                        },
                    ]}
                >
                    {inputNode}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};


export default ToolbarApp