import RitzSelection from '@/components/Ritz/RitzSelection';
import { Box, Button, Checkbox, IconButton, Switch, TextField, Tooltip } from '@mui/material';
import React, { useEffect, useState } from 'react'
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import { Typography } from '@mui/material';
import SaveSpinner from '@/components/SaveSpinner';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '@/services/api';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import { ACTIVE_STATUS, DEFAULT_SUCCESS, INACTIVE_STATUS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import { ColumnDef } from "@tanstack/react-table";
import RitzTable from '@/components/Ritz/RitzTable';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from '@/components/Ritz/RitzModal';
import FormErrorMessage from '@/components/FormErrorMessage';

const AddAttribute = ({ open, onClose, attributeId, materialId, material, refreshData }: any) => {

    const [showCard, setShowCard] = useState(false);
    const [attribute, setAttribute] = useState<any>({
        attribute_type: "",
        label: "",
        display_order: "",
        mandatory: true,
        active: true,
        is_material_variation:true,
        po_editable:true,
        is_grn_field: true
    });
    const [rows, setRows] = useState([]);
    const selectedattribute = material.userdefinedmaterialattribute_set.find((attribute: any) => {
        return attribute.id == attributeId;
    });
    const [optionstate, setoptionState] = useState([])
    const [showErrorNotification, setShowErrorNotification] = useState({ status: false, message: "" });
    const [showUpdateNotification, setShowUpdateNotification] = useState({ success: false, message: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
    const [isEditingEnabled, setIsEditingEnabled] = useState(false);
    const [closeEditableField, setCloseEditableField] = useState(false);
    const [attributeError, setAttributeError] = useState<any>({
        attribute_type: '',
        name: '',
        label: '',
        display_order: ''
    });
    const [isDisable, setIsDisable] = useState<boolean>(false);
    const [rowId, setRowId] = useState(null);
    const [isActive, setIsActive] = useState(false);

    //TO Do pending API
    const dummytypes = [{ "id": 'dropdown', "name": "Dropdown" },
    { "id": 'decimal', "name": "Decimal" },
    { "id": 'character', "name": "Character" },
    { "id": 'boolean', "name": "Boolean" },
    { "id": 'integer', "name": "Integer" }]

    const handleChangeAttributeType = (event: any) => {
        setAttribute({ ...attribute, [event?.target?.name]: event?.target?.value });
        if (event?.target?.value === 'dropdown') {
            setShowCard(true);
            handleAddRow();
        } else {
            setShowCard(false);
            setRows([]);
        }
        setAttributeError((prevError: any) => ({ ...prevError, attribute_type: '' }));
    };

    const handleChangeAttributeLabel = (event: any) => {
        setAttribute({ ...attribute, [event?.target?.name]: event?.target?.value });
        setCloseEditableField(true);
        setAttributeError((prevError: any) => ({ ...prevError, label: '' }));
    };

    const handleChangeAttributeDisplayOrder = (event: any) => {
        setAttribute({ ...attribute, [event?.target?.name]: event?.target?.value });
        setCloseEditableField(true);
        setAttributeError((prevError: any) => ({ ...prevError, display_order: '' }));
    };


    const handleAddRow = () => {
        setRows([{ display_value: '' }, ...rows]);
        setIsEditingEnabled(false);
        setSelectedRowIndex(-1);
    };

    const handleRowChange = (index: number, field: string, value: string) => {
        const updatedRows = [...rows];
        updatedRows[index][field] = value;
        setRows(updatedRows);
    };

    const handleRemoveRow = (index: number) => {
        const updatedRows = [...rows];
        updatedRows.splice(index, 1);
        setRows(updatedRows);
    };

    const attributeDetails = {
        userdefineddropdownoption_set: rows,
        is_material_variation:attribute.is_material_variation,
        po_editable:attribute.po_editable,
        is_grn_field:attribute.is_grn_field,
        attribute_type: attribute.attribute_type,
        label: attribute.label,
        material: materialId,
        display_order: attribute.display_order,
        mandatory: attribute.mandatory,
        active: attribute.active,
    }

    const handleSaveMaterial = () => {
        setAttributeError({});
        setIsSaving(true);

        const request = {
            method: attributeId === 0 ? 'post' : 'put',
            url:
                attributeId === 0
                    ? RestUrls.createMaterialAttributeURL()
                    : RestUrls.updateMaterialAttributeURL(attributeId),
            data: attributeDetails
        };

        api(request)
            .then(() => {
                toast.success(DEFAULT_SUCCESS);
                onClose();
                refreshData();
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
                if (error.response.status == VALIDATION_ERROR_CODE && error?.response?.data) {
                    const errorMsg = error.response.data;
                    setAttributeError(errorMsg);
                }
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    const handleSwitchChange = (newRowId: any, newIsActive: any) => {
            if (newRowId) {
                const rowId = newRowId;
                const isActive = newIsActive;

                const objectStateChange = {
                    id: rowId,
                    active: isActive,
                }

                api.put(RestUrls.changeDropdownOptionStateURL(rowId), objectStateChange).then(resp => {
                    const reseditdata = resp?.data || {};
                    setoptionState({ ...reseditdata });
                    const successMessage = resp?.data?.message;
                    if (successMessage) {
                        setShowUpdateNotification({ success: true, message: successMessage });
                    } else {
                        setShowUpdateNotification({ success: true, message: "User removed from group successfully." });
                    }

                }).catch(error => {
                    // TODO ERROR
                    // if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                    //     setErrors(error.response.data);
                    // }
                    toast.error(getDefaultError(error?.response?.status));
                });
            }
      
    };

    const handleFocus = (index: number) => {
        setSelectedRowIndex(index);
    };

    const handleTextFieldClick = (field: string) => {
        if (field === 'label' || field === 'display_order') {
            setCloseEditableField(true);
            setSelectedRowIndex(-1);
        }
    };

    useEffect(() => {
        if (attributeId > 0) {
            setAttribute({ ...selectedattribute })
            setRows([...selectedattribute?.userdefineddropdownoption_set])
            setShowCard(true);
        }
    }, [attributeId])


    useEffect(() => {
        if (attributeId > 0) {
            setIsDisable(true)
        }
    }, [attributeId])

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_value',
            header: 'Option Value',
            cell: (props) => {
                return (
                    <div>
                        {props.row.original.id > 0 ? (
                            // selectedRowIndex !== props.row.index || !isEditingEnabled ? (
                            //     <Typography>{props.row.original.display_value}</Typography>
                            // ) : (
                            <TextField
                                id={`display_value-${props.row.index}`}
                                name={`display_value-${props.row.index}`}
                                type="display_value"
                                value={props.row.original.display_value || ''}
                                onChange={(e) => handleRowChange(props.row.index, 'display_value', e.target.value)}
                                required
                                fullWidth
                                size="small"
                                autoFocus
                                disabled={selectedRowIndex !== props.row.index || !isEditingEnabled}
                            />
                            // )
                        ) : (
                            <TextField
                                id={`display_value-${props.row.index}`}
                                name={`display_value-${props.row.index}`}
                                type="display_value"
                                value={props.row.original.display_value || ''}
                                onChange={(e) => handleRowChange(props.row.index, 'display_value', e.target.value)}
                                required
                                fullWidth
                                size="small"
                                autoFocus={selectedRowIndex === props.row.index}
                                onFocus={() => handleFocus(props.row.index)}
                            />
                        )}

                    </div>
                );
            },
            meta: {
                align: 'left',
                width: 500,
            },
        },
        {
            accessorKey: 'id',
            header: 'Status',
            cell: (props) => {
                return (
                    <>
                        {props.row.original.id > 0 ? (
                            <div>
                                <Switch
                                    id={`switch-${props.row.original.id}`}
                                    checked={props.row.original.active}
                                    name="active"
                                    color="primary"
                                    onChange={(event) => {
                                        const updatedRows = [...rows];
                                        updatedRows[props.row.index].active = event.target.checked;
                                        setRows(updatedRows);
                                        handleSwitchChange(props.row.original.id, event.target.checked);
                                    }}
                                />
                                <label htmlFor={`switch-${props.row.original.id}`}>
                                    {props.row.original.active ? ACTIVE_STATUS : INACTIVE_STATUS}
                                </label>
                            </div>
                        ) : (
                            <>
                                <Tooltip title="Not allowed for unsaved options">
                                    <div>
                                        <Switch disabled checked />
                                        <label>{ACTIVE_STATUS}</label>
                                    </div>
                                </Tooltip>
                            </>
                        )}
                    </>
                );
            },
            meta: {
                align: 'right',
                width: 25,
            },
        },
        {
            accessorKey: 'id',
            header: attributeId > 0 || (rows.length > 1 && attributeId === 0) ? 'Action' : '',
            cell: (props) => {
                return (
                    <div>
                        {rows.length > 1 && attributeId === 0 && (
                            <IconButton onClick={() => handleRemoveRow(props.row.index)} size="small" color="error">
                                <DeleteIcon />
                            </IconButton>
                        )}
                        {attributeId > 0 && props.row.original.id == null && (
                            <IconButton onClick={() => handleRemoveRow(props.row.index)} size="small" color="error">
                                <DeleteIcon />
                            </IconButton>
                        )}
                        {props.row.original.id > 0 && (
                            <>
                                {attributeId > 0 && selectedRowIndex !== props.row.index && (
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => {
                                            setIsEditingEnabled(true);
                                            setSelectedRowIndex(props.row.index);
                                        }}
                                    >
                                        <EditIcon fontSize="inherit" />
                                    </IconButton>
                                )}
                                {selectedRowIndex === props.row.index && (
                                    <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={() => {
                                            setIsEditingEnabled(false);
                                            setSelectedRowIndex(-1);
                                        }}
                                    >
                                        <CancelIcon fontSize="inherit" />
                                    </IconButton>
                                )}
                            </>
                        )}
                    </div>
                );
            },
            meta: {
                align: 'right',
                width: 25,
            },
        },
    ];

    return (
        <RitzModal open={open} onClose={onClose} title='Attribute Information' maxWidth='md'>
            <Box marginBottom={2}>
                <Typography style={{ fontWeight: 'bold', marginBlock: '10px' }}>Attribute Type</Typography>
                <RitzSelection
                    id={'attribute_type'}
                    name={'attribute_type'}
                    optionValue={'id'}
                    optionText={'name'}
                    selectedValue={attribute.attribute_type}
                    isRequired={true}
                    options={dummytypes}
                    isReadOnly={isDisable}
                    handleOnChange={handleChangeAttributeType}
                >
                </RitzSelection>
                {attributeError.attribute_type && <FormErrorMessage message={attributeError.attribute_type} />}
            </Box>
            <Box marginBottom={2}>
                <Typography style={{ fontWeight: 'bold' }}>Label</Typography>
                <TextField
                    id="label"
                    type='text'
                    value={attribute.label || attribute?.label}
                    name="label"
                    required
                    onChange={handleChangeAttributeLabel}
                    onClick={() => handleTextFieldClick('label')}
                    style={{ marginTop: '10px' }}
                    fullWidth
                />
                {attributeError.label && <FormErrorMessage message={attributeError.label} />}
            </Box>
            <Box marginBottom={2}>
                <Typography style={{ fontWeight: 'bold' }}>Display Order</Typography>
                <TextField
                    id="display_order"
                    type='text'
                    value={attribute.display_order || attribute?.display_order}
                    name="display_order"
                    required
                    onChange={handleChangeAttributeDisplayOrder}
                    onClick={() => handleTextFieldClick('display_order')}
                    style={{ marginTop: '10px' }}
                    fullWidth
                />
                {attributeError.display_order && <FormErrorMessage message={attributeError.display_order} />}
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>

                    <Checkbox checked={attribute?.mandatory || false} name="mandatory" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                    Is Required
                </Typography>
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>

                    <Checkbox checked={attribute?.active || false} name="active" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                    Status
                </Typography>
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>

                    <Checkbox checked={attribute?.is_material_variation || false} name="is_material_variation" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                        Is Variation
                </Typography>
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>

                    <Checkbox checked={attribute?.po_editable || false} name="po_editable" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                        Po Editable
                </Typography>
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>
                    <Checkbox checked={attribute?.is_grn_field || false} name="is_grn_field" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                    Is GRN Field
                </Typography>
            </Box>
            <Box marginBottom={1}>
                <Typography style={{ fontWeight: 'bold', marginLeft: '-10px' }}>
                    <Checkbox checked={attribute?.size_field || false} name="size_field" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                    }} />
                    Is Size Field
                </Typography>
            </Box>

            {showCard && (
                <>
                    {attribute.attribute_type === "dropdown" && (
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 'bold' }}>Dropdown Options</Typography>

                                <Button onClick={handleAddRow} variant="outlined" size='small'>
                                    <AddIcon fontSize='small' />Add Option
                                </Button>
                            </Box>
                            
                            <RitzTable
                                data={rows}
                                columns={columns}
                                hideFilters
                                hideSorting
                            />
                        </Box>
                    )}
                </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant="contained" onClick={handleSaveMaterial} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}
                    Save
                </Button>
            </Box>
        </RitzModal>
    )
}

export default AddAttribute


