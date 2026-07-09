import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import NextLink from 'next/link';
import { ColumnDef } from "@tanstack/react-table";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Card, Typography, Link, IconButton, Button, Box, Switch, TextField, Checkbox } from '@mui/material';
import RitzTable from '@/components/Ritz/RitzTable';
import EditIcon from '@mui/icons-material/Edit';
import { ACTIVE_STATUS, DEFAULT_SUCCESS, INACTIVE_STATUS } from '@/helpers/constants/Constants';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzFormErrors from '@/components/Ritz/RitzFormErrors';
import RitzSelection from '@/components/Ritz/RitzSelection';
import SaveSpinner from '@/components/SaveSpinner';

const EditAttributeDetail = ({ materialID, attributeId, isMaterialOptions = false }: any) => {

    const dummytypes = [{ "id": 'dropdown', "name": "Dropdown" },
    { "id": 'decimal', "name": "Decimal" },
    { "id": 'character', "name": "Character" },
    { "id": 'boolean', "name": "Boolean" },
    { "id": 'integer', "name": "Integer" }]

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_value',
            header: 'Option Value',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
        },
        {
            header: 'Status',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS,
            meta: {
                width: 300,
            },
        },
        {
            accessorKey: 'id',
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: (props) => {
                return (
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => { modalOpen(true, "Edit Dropdown Option", props.row.original.id, props.row.original.display_value, props.row.original.active) }} >
                        <EditIcon fontSize="inherit" />
                    </IconButton >
                )
            },
            meta: {
                width: 100,
                align: 'right'
            },
        }
    ]

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isOptionSaving, setIsOptionSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDisable, setIsDisable] = useState<boolean>(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [dropdownOption, setDropdownOption] = useState({ id: 0, display_value: '', active: true });
    const [attribute, setAttribute] = useState<any>({ category: '', material: '', consumption_measurement_unit: '', userdefineddropdownoption_set: [] });

    const handleChange = (event: any) => {
        setDropdownOption({
            ...dropdownOption,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeState = (event: any) => {
        setDropdownOption({
            ...dropdownOption,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Option Name', name: 'display_value', value: dropdownOption?.display_value || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: dropdownOption?.active, type: 'switch', onChange: handleChangeState, isDisabled: dropdownOption?.id === 0 },
    ];

    const fetchMaterialDetails = () => {
        setIsLoading(true);
        if (materialID > 0) {
            api.get(RestUrls.getMaterialDetailURL(materialID as any))
                .then((response) => {
                    const materialDetail = response.data;
                    const foundAttribute = materialDetail.userdefinedmaterialattribute_set.find((attribute: any) => attribute.id === Number(attributeId));
                    if (foundAttribute) {
                        setAttribute(foundAttribute);
                    }
                }).catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                }).finally(() => setIsLoading(false));
        }
    }

    const modalOpen = (isOpen: any, title: string, optionId: any, optionValue: any, optionState: any) => {
       try{
           setErrors({});
           setIsModalLoading(true);
           setTitle(title);
           setOpen(isOpen);
           setDropdownOption({
               ...dropdownOption,
               id: optionId,
               display_value: optionValue,
               active: optionState
           });
       }finally{
           setIsModalLoading(false);
       }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const handleChangeAttributeLabel = (event: any) => {
        setAttribute({ ...attribute, [event?.target?.name]: event?.target?.value });
    };

    const handleChangeAttributeDisplayOrder = (event: any) => {
        setAttribute({ ...attribute, [event?.target?.name]: event?.target?.value });
    };

    const attributeOptionDetails = {
        userdefineddropdownoption_set: [] as any,
        is_material_variation: attribute.is_material_variation,
        attribute_type: attribute.attribute_type,
        label: attribute.label,
        material: materialID,
        display_order: attribute.display_order,
        mandatory: attribute.mandatory,
        active: attribute.active,
    };

    if (dropdownOption.id) {
        attributeOptionDetails.userdefineddropdownoption_set.push({
            id: dropdownOption.id,
            display_value: dropdownOption.display_value,
        });
    } else {
            attributeOptionDetails.userdefineddropdownoption_set.push({
                display_value: dropdownOption.display_value,
            });
    }

    const DropDownOptionState = {
        id: dropdownOption.id,
        active: dropdownOption.active
    }

    const attributeDetails = {
        // userdefineddropdownoption_set: [] as any,
        is_material_variation: attribute.is_material_variation,
        po_editable:attribute.po_editable,
        is_grn_field:attribute.is_grn_field,
        attribute_type: attribute.attribute_type,
        label: attribute.label,
        material: materialID,
        display_order: attribute.display_order,
        mandatory: attribute.mandatory,
        active: attribute.active,
    };

    const handleSave = () => {
        setIsSaving(true);
        api.put(RestUrls.updateMaterialAttributeURL(attributeId), attributeDetails).then(() => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => { setIsSaving(false) });
    };

    const handleOptionSave = () => {
        setIsOptionSaving(true);
        api.put(RestUrls.updateMaterialAttributeURL(attributeId), attributeOptionDetails).then(() => {
            setOpen(false);
            fetchMaterialDetails();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => { setIsOptionSaving(false) });
    };

    const handleOptionState = () => {
        if (dropdownOption.id && dropdownOption.active !== undefined) {
            api.put(RestUrls.changeDropdownOptionStateURL(dropdownOption.id), DropDownOptionState).then(resp => {
                const reseditdata = resp?.data || {};
                const successMessage = resp?.data?.message;
                if (successMessage) {
                    toast.success(DEFAULT_SUCCESS)
                } else {
                    //
                }
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
        }
    }

    useEffect(() => {
        fetchMaterialDetails()
    }, [materialID]);

    useEffect(() => {
        if (attributeId > 0) {
            setIsDisable(true)
        }
    }, [attributeId])
    return (
        <>
            {!isMaterialOptions ? (
                <>
                    <Breadcrumbs
                        separator={<NavigateNextIcon fontSize="small" />}
                        aria-label="breadcrumb"
                        sx={{ mb: 1.5 }}>
                        <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/materials'}>Material List</Link>
                        <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/materials/' + materialID}>Material Details</Link>
                        <Typography color='text.primary'>Edit {attribute?.label}</Typography>
                    </Breadcrumbs>
                </>
            ) : (
                <>
                    <Breadcrumbs
                        separator={<NavigateNextIcon fontSize="small" />}
                        aria-label="breadcrumb"
                        sx={{ mb: 1.5 }}>
                        <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/material_options'}>Material Options</Link>
                        <Typography color='text.primary'>Edit {attribute?.label}</Typography>
                    </Breadcrumbs>
                </>
            )}
            <Typography variant='h1'>Edit {attribute?.label}</Typography>
            <Card sx={{ padding: '15px' }}>
                {attribute.attribute_type === "dropdown" && <Button onClick={() => { modalOpen(true, "Create New Dropdown Option", 0, "", true) }} variant='outlined' color='primary' style={{ float: 'right' }}>Add Dropdown Option</Button>}

                <Box sx={{ marginTop: !isMaterialOptions ? '50px' : 0 }}>
                    {!isMaterialOptions &&
                        <>
                            <Typography style={{ fontWeight: 'bold', marginBottom: '25px' }}>Attribute Type</Typography>
                            <RitzSelection
                                id={'attribute_type'}
                                name={'attribute_type'}
                                optionValue={'id'}
                                optionText={'name'}
                                selectedValue={attribute.attribute_type || ''}
                                isRequired={true}
                                options={dummytypes}
                                isReadOnly={isDisable}
                            >
                            </RitzSelection>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>Label</Typography>
                            <TextField
                                id="label"
                                type='text'
                                value={attribute.label || ''}
                                name="label"
                                required
                                onChange={handleChangeAttributeLabel}
                                style={{ marginTop: '25px' }}
                                fullWidth
                            />
                        <RitzFormErrors errorList={errors.label} />
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>Display Order</Typography>
                            <TextField
                                id="display_order"
                                type='text'
                                value={attribute.display_order || ''}
                                name="display_order"
                                required
                                onChange={handleChangeAttributeDisplayOrder}
                                style={{ marginTop: '25px' }}
                                fullWidth
                            />
                            <RitzFormErrors errorList={errors.display_order} />
                            <Typography style={{ fontWeight: 'bold', marginRight: '10px', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.mandatory || false} name="mandatory" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Is Required
                            </Typography>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.active || false} name="active" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Status
                            </Typography>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.is_material_variation || false} name="is_material_variation" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Is Variation
                            </Typography>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.po_editable || false} name="po_editable" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Po Editable
                            </Typography>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.is_grn_field || false} name="is_grn_field" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Is GRN Field
                            </Typography>
                            <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                                <Checkbox checked={attribute?.size_field || false} name="size_field" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setAttribute({ ...attribute, [event.target.name]: event.target.checked });
                                }} />
                                Is Size Field
                            </Typography>
                            <Button variant="contained" onClick={handleSave} sx={{ float: 'right', position: 'static' }}>{isSaving && <SaveSpinner />}Save</Button>
                        </>}
                </Box>
            {attribute.attribute_type === "dropdown" && <RitzTable data={attribute.userdefineddropdownoption_set} columns={columns} />}
            </Card>
            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={() => { handleOptionSave(), handleOptionState() }} submitId={dropdownOption.id} errors={errors} isSaving={isOptionSaving} />
            </RitzModal>
        </>
    )
}

export default EditAttributeDetail