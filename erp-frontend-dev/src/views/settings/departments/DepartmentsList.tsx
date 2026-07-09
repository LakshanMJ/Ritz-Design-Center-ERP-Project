import React, { useEffect, useState } from "react";
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

const DepartmentsList = () => {
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'department',
            header: 'Department',
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
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Season", props.getValue())}>
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
    const [selectedDepartmentData, setSelectedDepartmentData] = useState({ id: 0, department: '', customer_brand: 0, active: true });
    const [editDepartmentId, setEditDepartmentId] = useState(0);
    const [departments, setDepartments] = useState<any>([]);
    const [customerBrandData, setCustomerBrandData] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setSelectedDepartmentData({
            ...selectedDepartmentData,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setSelectedDepartmentData({
            ...selectedDepartmentData,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Department Name', name: 'department', value: selectedDepartmentData?.department || '', type: 'text', onChange: handleChange },
        { label: 'Customer & Brand', name: 'customer_brand', value: selectedDepartmentData?.customer_brand || '', type: 'select', optionText: 'customer_brand_name', optionValue: 'id', options: customerBrandData, onChange: handleChange },
        { label: 'Status', name: 'active', value: selectedDepartmentData?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, departmentId: any) => {
        setTitle(title);
        setEditDepartmentId(departmentId);
        setOpen(isOpen);
        if (departmentId === 0) {
            setSelectedDepartmentData({ id: 0, department: "", customer_brand: 0,  active: true });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.departmentDetailsURL(departmentId)).then(resp => {
                const reseditdata = resp?.data || {};
                setSelectedDepartmentData({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.departmentListURL()),
            api.get(RestUrls.customerBrandListURL())   
        ]).then(resp => {
            const [departmentList, customerBrandData] = resp.map(r => r.data)
            departmentList.sort((a: any, b: any) => b.id - a.id);
            setDepartments([...departmentList]);
            setCustomerBrandData([...customerBrandData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});
        const request = {
            method: editDepartmentId == 0 ? 'post' : 'put',
            url: editDepartmentId == 0 ? RestUrls.departmentCreateURL() : RestUrls.updateDepartmentURL(editDepartmentId),
            data: selectedDepartmentData
        }
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
            <Typography variant='h1'>Departments List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Department", 0) }}>Add Department</Button>
                <RitzTable
                    data={departments}
                    columns={columns}
                />
            </>}
            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editDepartmentId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default DepartmentsList;
