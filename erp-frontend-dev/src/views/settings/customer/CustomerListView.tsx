import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import { ColumnDef } from "@tanstack/react-table";
import RitzTable from "@/components/Ritz/RitzTable";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const CustomerListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Customer',
        },
        {
            accessorKey: 'phone_number',
            header: 'Mobile Number',
        },
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            accessorKey: 'code',
            header: 'Code',
        },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Customer", props.getValue())}>
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
    const [customer, setCustomer] = useState<any>({ id: 0, name: "", brands: [], phone_number: "", email: "", code: "", contact_persons: [], po_processor: null });
    const [editCustomerId, setEditCustomerId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [customers, setCustomers] = useState<any>([]);
    const [brands, setBrands] = useState<any>([]);
    const [poProcessors, setPoProcessors] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setCustomer({
            ...customer,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleMultiSelectChange = (name: any, value: any) => {
        setCustomer((prevFormData: any) => ({ ...prevFormData, brands: value }));
      };

    const formFields: any[] = [
        { label: 'Customer Name', name: 'name', value: customer?.name || '', type: 'text', onChange: handleChange },
        { label: 'Brand', name: 'brand', type: 'autocomplete_multi_select', options: brands, optionText: 'name', optionValue: 'id', value: customer.brands, onChange: (name: any, value: any) => handleMultiSelectChange(name, value) },
        { label: 'Mobile Number', name: 'phone_number', value: customer?.phone_number || '', type: 'text', onChange: handleChange },
        { label: 'Email', name: 'email', value: customer?.email || '', type: 'text', onChange: handleChange },
        { label: 'PO Processor', name: 'po_processor_name', type: 'select', options: poProcessors, optionText: 'name', optionValue: 'id', value: customer.po_processor_name, onChange: handleChange },
        { label: 'Code', name: 'code', value: customer?.code || '', type: 'text', onChange: handleChange }
    ]

    const modalOpen = (isOpen: any, title: string, customerId: any) => {
        setTitle(title)
        setEditCustomerId(customerId);
        setOpen(isOpen);

        if (customerId === 0) {
            setCustomer({ id: 0, name: "", brands: [], phone_number: "", email: "", code: "", contact_persons: []  });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.customerURL(customerId)).then(resp => {
                const reseditdata = resp?.data || {};
                setCustomer({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getCustomers = () => {
        setIsLoading(true);

        const requests = [
            api.get(RestUrls.customersURL()),
            api.get(RestUrls.brandsURL()),
            api.get(RestUrls.poProcessorListURL())
        ]


        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [customerData, brandData, poProcessorData] = respData
            customerData.sort((a: any, b: any) => b.id - a.id);
            setCustomers([...customerData]);
            setBrands([...brandData])
            setPoProcessors([...poProcessorData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});
        const brandIds = customer.brands.map((brand: any) => brand.id);
        const customerData = {
            id:customer.id,
            name:customer.name,
            phone_number:customer.phone_number,
            email:customer.email,
            brands: brandIds,
            contact_persons: customer.contact_persons,
            code: customer.code,
            po_processor_name: customer.po_processor_name
        }

        const request = {
            method: editCustomerId === 0 ? 'post' : 'put',
            url: editCustomerId === 0 ? RestUrls.createCustomerURL() : RestUrls.updateCustomerURL(editCustomerId),
            data: customerData
        }

        api(request).then(() => {
            setOpen(false);
            getCustomers();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    };

    useEffect(() => {
        getCustomers();
    }, []);

    return (
        <>
            <Typography variant='h1'>Customer List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Customer", 0) }}>Add Customer</Button>
                <RitzTable
                    // title="Customer List"
                    data={customers}
                    columns={columns}
                />
            </>}
            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editCustomerId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default CustomerListView;