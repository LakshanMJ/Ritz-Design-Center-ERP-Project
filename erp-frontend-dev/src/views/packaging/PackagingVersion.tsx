import React, { useEffect, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader'
import { Box, Button, Card, CardContent, CardHeader, IconButton, List, ListItem, ListItemText, TextField } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import api from "@/services/api";
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { grey } from '@mui/material/colors';
import { orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import { useRouter } from 'next/router';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';


const PackagingVersion = ({ orderId, versionId, selectedPackagingVersion, setOpen, setVersionUpdated, loadPackagingVersion }: any) => {

    const router = useRouter();

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Packaging Version',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => {
                const isDisabled = props.row.original.id === selectedPackagingVersion;
                return (
                    <ListItemText
                        onClick={() => !isDisabled && handleVersionClick(props.row.original.id)}
                        sx={{
                            cursor: isDisabled ? 'default' : 'pointer',
                            color: isDisabled ? 'text.disabled' : 'primary.main'
                        }}
                    >
                        {props.row.original.display_number}
                    </ListItemText>
                )
            }
        },
        {
            accessorKey: "id",
            header: 'Status',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => {
                const status = props.row.original.current_version;
                return (
                    <>
                        {props.row.original.current_version ? (
                               <DoneIcon sx={{ color: '#059212' }} />
                        ) : (
                            <CloseIcon  color='error' />
                        )}
                    </>
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const [isLoading, setIsLoading] = useState(true);
    const [versions, setVersions] = useState<any>([]);
    const [isCreatingVersion, setIsCreatingVersion] = useState(false);

    const getVersions = () => {
        setIsLoading(true);
        api.get(RestUrls.packagingVersionsURL(versionId)).then(resp => {
            const resdata = resp?.data || [];
            setVersions([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() =>
            setIsLoading(false)
        );
    };

    const handleCreateVersion = () => {
        const request = {
            method: 'post',
            url: RestUrls.createPackagingVersionURL(versionId),
            data: {}
        };
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            getVersions()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        });
    };

    const handleVersionClick = (versionId: any) => {
        loadPackagingVersion(versionId)
    }

    useEffect(() => {
        if (orderId) {
            getVersions();
        }
    }, [orderId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleCreateVersion}
                        variant="text"
                        size="small"
                        sx={{ marginBottom: '1%', float: 'right', marginRight: '5px' }}
                    >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Add Version
                                {isCreatingVersion && <SaveSpinner />}
                            </Box>
                    </Button>
                    <RitzTable
                        data={versions}
                        columns={columns}
                        enableGlobalFilter={false}
                        enableColumnFilter={false}
                        pagination={false} />
                </>
            )}
        </>

    )
}

export default PackagingVersion