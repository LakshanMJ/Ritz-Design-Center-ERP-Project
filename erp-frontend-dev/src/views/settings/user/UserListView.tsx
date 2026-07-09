import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Link, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import NextLink from 'next/link';
import DefaultLoader from "@/components/DefaultLoader";
import { userProfileURL } from "../../../helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";


const UserListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'username',
            header: 'Username',
            cell: props => (
                <Link component={NextLink} href={userProfileURL(props.row.getValue('id'))}>{props.row.getValue('username') ?? ''}</Link>
            )
        },
        {
            accessorKey: 'first_name',
            header: 'First Name'
        },
        {
            accessorKey: 'last_name',
            header: 'Last Name',
        },
        {
            accessorKey: 'email',
            header: 'Email',
        },
        {
            accessorKey: "id",
            header: 'Edit',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => [modalOpen(true, "Edit User", props.getValue()), setShowResetButton(true), changePasswordEmpty()]}>
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
    const [user, setUser] = useState({ id: null, first_name: "", last_name: "", email: "", username: "", is_active: true, password: "", password2: "", reset_password: false });
    const [editUserId, setEditUserId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [users, setUsers] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [showPasswordFields, setShowPasswordFields] = useState(false)
    const [showPasswordFieldsCreate, setShowPasswordFieldsCreate] = useState(false)
    const [showResetButton, setShowResetButton] = useState(false)

    const [userPassword, setUserPassword] = useState('')
    const [userPassword2, setUserPassword2] = useState('')

    const showPasswordFileds = () => {
        setShowPasswordFields(!showPasswordFields)
    }
    const showPasswordFiledsCreate = () => {
        setShowPasswordFieldsCreate(!showPasswordFieldsCreate)
    }

    const handleChange = (event: any) => {
        setUser({
            ...user,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields: any[] = [
        { label: 'First Name', name: 'first_name', value: user?.first_name || null, type: 'text', onChange: handleChange },
        { label: 'Last Name', name: 'last_name', value: user?.last_name || null, type: 'text', onChange: handleChange },
        { label: 'Email', name: 'email', value: user?.email || null, type: 'text', onChange: handleChange },
        { label: 'Username', name: 'username', value: user?.username || null, type: 'text', onChange: handleChange },
        ...(showResetButton
            ? [{ label: 'Reset Password', name: 'reset_password', type: 'outlined', onClick: showPasswordFileds }]
            : []
        ),
        ...(showPasswordFields
            ? [{ label: 'Password', name: 'password', value: user?.password || null, type: 'password', onChange: handleChange },
            // { label: 'Generate Password', type: 'outlined', onClick: handleGeneratePassword, color: 'warning' },
            { label: 'Confirm Password', name: 'password2', value: user?.password2 || null, type: 'confirm_password', onChange: handleChange },]
            : []
        ),
        ...(showPasswordFieldsCreate
            ? [{ label: 'Password', name: 'password', value: user?.password || null, type: 'password', onChange: handleChange, },
            // { label: 'Generate Password', type: 'outlined', onClick: handleGeneratePassword, color: 'warning' },
            { label: 'Confirm Password', name: 'password2', value: user?.password2 || null, type: 'confirm_password', onChange: handleChange },]
            : []
        ),
    ]

    const modalOpen = (isOpen: any, title: string, userId: any) => {
        setTitle(title);
        setEditUserId(userId);
        setOpen(isOpen);
        setShowPasswordFields(false);
        setShowResetButton(false);
        setShowPasswordFieldsCreate(false);

        if (userId === 0) {
            setUser({ id: 0, first_name: "", last_name: "", email: "", username: "", is_active: true, password: "", password2: "", reset_password: false });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.userURL(userId)).then(resp => {
                const reseditdata = resp?.data || {};
                setUser({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const changeFieldsEmpty = () => {
        setUser({ id: null, first_name: "", last_name: "", email: "", username: "", is_active: true, password: "", password2: "", reset_password: false });
        setUserPassword('');
        setUserPassword2('');
    }

    const changePasswordEmpty = () => {
        setUserPassword('');
        setUserPassword2('');
    }

    const newUser = {
        id: 0,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: user.password,
        password2: user.password2,
        username: user.username,
        is_active: user.is_active,
    }

    const updateCurrentUser = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        ...(showPasswordFields && {
            new_password: user.password,
            new_password2: user.password2,
        }),
        reset_password: Boolean(showPasswordFields),
        username: user.username,
        is_active: user.is_active,
    }

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getUsers = () => {
        setIsLoading(true);
        api.get(RestUrls.usersURL()).then(resp => {
            const resdata = resp?.data || [];
            setUsers([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editUserId === 0 ? 'post' : 'put',
            url: editUserId === 0 ? RestUrls.createUserURL() : RestUrls.updateUserURL(editUserId),
            data: editUserId === 0 ? newUser : updateCurrentUser
        }

        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setOpen(false);
            getUsers();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    };

    useEffect(() => {
        getUsers();
    }, []);

    return (
        <>
            <Typography variant='h1'>Users</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create User", 0), changeFieldsEmpty(), showPasswordFiledsCreate(), setShowPasswordFieldsCreate(true) }}>Add User</Button>
                <RitzTable
                    data={users}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editUserId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default UserListView;
