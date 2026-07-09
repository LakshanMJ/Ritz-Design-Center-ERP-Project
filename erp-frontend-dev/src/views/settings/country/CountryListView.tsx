import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const CountryListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Country',
        },
        {
            accessorKey: 'customer_brand_name',
            header: 'Customer and Brand',
        },
        {
            accessorKey: 'active',
            header: 'Status',
            accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
        },
        {
            accessorKey: 'id',
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Country", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ]

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [country, setCountry] = useState({ id: 0, name: '', customer_brand: 0, active: true });
    const [editCountryId, setEditCountryId] = useState(0);
    const [countries, setCountries] = useState<any>([]);
    const [customerBrandData, setCustomerBrandData] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        console.log(event?.target?.name)
        setCountry({
            ...country,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setCountry({
            ...country,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Country Name', name: 'name', value: country?.name || '', type: 'text', onChange: handleChange },
        { label: 'Customer & Brand', name: 'customer_brand', value: country?.customer_brand || '', type: 'select', optionText: 'customer_brand_name', optionValue: 'id', options: customerBrandData, onChange: handleChange },
        { label: 'Status', name: 'active', value: country?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, countryId: any) => {
        setEditCountryId(countryId);
        setTitle(title);
        setOpen(isOpen);

        if (countryId === 0) {
            setCountry({ id: 0, name: "", customer_brand: 0, active: true });
        } else {
            setIsModalLoading(true);

            api.get(RestUrls.CountryURL(countryId)).then(resp => {
                const reseditdata = resp?.data || {};
                setCountry({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsModalLoading(false);
            });
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.countriesURL()),
            api.get(RestUrls.customerBrandListURL())   
        ]).then(resp => {
            const [CountryList, customerBrandData] = resp.map(r => r.data)
            setCountries([...CountryList]);
            setCustomerBrandData(customerBrandData)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editCountryId === 0 ? 'post' : 'put',
            url: editCountryId === 0 ? RestUrls.createCountryURL() : RestUrls.updateCountryURL(editCountryId),
            data: country
        };

        api(request).then(() => {
            setOpen(false);
            getData();
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
        getData();
    }, []);


    return (
        <>
            <Typography variant='h1'>Country List</Typography>
            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Country", 0) }}>Add Country</Button>

                <RitzTable data={countries} columns={columns} />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editCountryId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};
export default CountryListView;