import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Link, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import * as SupplierUrls from '../../../helpers/constants/rest_urls/SupplierUrls'
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import { toast } from 'react-hot-toast';
import NextLink from 'next/link';
import { getDefaultError } from '@/helpers/Utilities';
import { supplierDetailsURL } from "@/helpers/constants/FrontEndUrls";


const SupplierListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Supplier Name',
            cell: props => (
                <Link component={NextLink} href={supplierDetailsURL(props.row.getValue('id'))}>{props.row.getValue('name') ?? ''}</Link>
            )
        },
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            accessorKey: 'phone_number',
            header: 'Phone Number',
        },
        {
            accessorKey: 'address_line_1',
            header: 'Address Line 1',
        },
        {
            accessorKey: 'address_line_2',
            header: 'Address Line 2',
        },
        {
            accessorKey: 'fax',
            header: 'Fax',
        },
        {
            accessorKey: 'active',
            header: 'Status',
            accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
        },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Supplier", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [supplier, setSupplier] = useState({ id: 0, name: "", email: "", phone_number: "", location: "", fax: "", payment_term: 0,   shipping_mode: 0,   costing_mode: 0,   ex_fty_to_inhouse: 0,   fob_to_inhouse: 0, remarks: '',  active: true, raw_material: false, service: false });
    const [editSupplierId, setEditSupplierId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [suppliers, setSuppliers] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [metaData, setMataData] = useState<any>({});
    const [categoryType, setCategoryType] = useState<any>('all');

    const handleChangeButton = (event: any, type: any) => {
        setCategoryType(type);
        if(type){
            getSuppliers(type)
        }
        else{
            getSuppliers('all')
        }
    };

    const stateOption = [
        {
          id: 1,
          name: 'Status'
        }
      ]

      const rawMaterialOption = [
        {
          id: 1,
          name: 'Raw Material'
        }
      ]

      const serviceOption = [
        {
          id: 1,
          name: 'Service'
        }
      ]

    const handleChange = (event: any) => {
        setSupplier({
            ...supplier,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setSupplier({
            ...supplier,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const handleSelectChange = (event: any) => {
        setSupplier({ ...supplier, [event?.target?.name]: event?.target?.value, });
    };

    const formFields: any[] = [
        { label: 'Supplier Name', name: 'name', value: supplier?.name || '', type: 'text', onChange: handleChange },
        { label: 'Email', name: 'email', value: supplier?.email || '', type: 'email', onChange: handleChange },
        { label: 'Phone Number', name: 'phone_number', value: supplier?.phone_number || '', type: 'text', onChange: handleChange },
        { label: 'Fax', name: 'fax', value: supplier?.fax || '', type: 'text', onChange: handleChange },
        { label: 'Location', name: 'location', value: supplier?.location || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.location_choices, onChange: handleSelectChange },
        { label: 'Payment Term', name: 'payment_term', value: supplier?.payment_term || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.payment_method_types, onChange: handleSelectChange },
        { label: 'Shipping Mode', name: 'shipping_mode', value: supplier?.shipping_mode || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.shipping_modes, onChange: handleSelectChange },
        { label: 'Costing Mode', name: 'costing_mode', value: supplier?.costing_mode || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.costing_modes, onChange: handleSelectChange },
        { label: 'Ex-Factory To Inhouse', name: 'ex_fty_to_inhouse', value: supplier?.ex_fty_to_inhouse || '', type: 'number', onChange: handleChange },
        { label: 'FOB Inhouse', name: 'fob_to_inhouse', value: supplier?.fob_to_inhouse || '', type: 'number', onChange: handleChange },
        { label: 'Remark', name: 'remarks', value: supplier?.remarks || '', type: 'text', onChange: handleChange },
        { label: '', name: 'active', value: supplier?.active, type: 'checkbox', optionText: 'name', optionValue: 'id', options: stateOption, onChange: handleChangeChacked },
        { label: '', name: 'raw_material', value: supplier?.raw_material, type: 'checkbox', optionText: 'name', optionValue: 'id', options: rawMaterialOption, onChange: handleChangeChacked },
        { label: '', name: 'service', value: supplier?.service, type: 'checkbox',  optionText: 'name', optionValue: 'id', options: serviceOption, onChange: handleChangeChacked },
    ]

    const modalOpen = (isOpen: any, title: string, supplierId: any) => {
        setTitle(title);
        setEditSupplierId(supplierId);
        setOpen(isOpen);

        if (supplierId === 0) {
            setSupplier({ id: 0, name: "", email: "", phone_number: "", location: "", fax: "", payment_term: 0,   shipping_mode: 0,   costing_mode: 0,   ex_fty_to_inhouse: 0,   fob_to_inhouse: 0, remarks: '',  active: true, raw_material: false, service: false });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.supplierURL(supplierId)).then(resp => {
                const reseditdata = resp?.data || {};
                setSupplier({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getSuppliers = (type:any) => {
        setIsLoading(true)
        let reportUrl;
        if (type === 'all') {
            reportUrl = RestUrls.suppliersURL();
        } else {
            reportUrl = RestUrls.categorizeSuppliersURL(type);
        }
        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setSuppliers([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const getSupplierMetaData = () => {
        api.get(SupplierUrls.supplierMetaDataUrl()).then(resp => {
            const respData = resp?.data || [];
            setMataData({...respData});
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
      };
    
    

    const handleSave = () => {
        setErrors({});
        setIsSaving(true);
        const request = {
            method: editSupplierId === 0 ? 'post' : 'put',
            url: editSupplierId === 0 ? RestUrls.createSupplierURL() : RestUrls.updateSupplierURL(editSupplierId),
            data: supplier
        }
        api(request).then(() => {
            setOpen(false);
            getSuppliers(categoryType);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    };

    useEffect(() => {
        getSuppliers(categoryType);
        getSupplierMetaData()
    }, []);



    return (
        <>
            <Typography variant='h1'>Supplier List</Typography>
            <Button variant="contained" onClick={() => { modalOpen(true, "Create New Supplier", 0) }}>Add Supplier</Button>
                <Box sx={{mt:2}}>
                    <ToggleButtonGroup
                        value={categoryType}
                        exclusive
                        onChange={handleChangeButton}
                        aria-label="text alignment"
                    >
                        <ToggleButton value="fabric" aria-label="left aligned" sx={{ width: '120px' }}>Fabric</ToggleButton>
                        <ToggleButton value="sewing_trim" aria-label="centered" sx={{ width: '120px' }}>Sewing Trims</ToggleButton>
                        <ToggleButton value="packaging_trim" aria-label="right aligned" sx={{ width: '120px' }}>Packaging</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            {isLoading ? <DefaultLoader /> : <>
                <RitzTable
                    data={suppliers}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editSupplierId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default SupplierListView;
