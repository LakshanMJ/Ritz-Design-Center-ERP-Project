import React, { useEffect, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader'
import { Box, Button, Card, CardContent, CardHeader, FormControlLabel, IconButton, InputLabel, List, ListItem, ListItemText, TextField } from '@mui/material'
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
import RitzModal from '@/components/Ritz/RitzModal';
import OrderStyleNumbers from './OrderStyleNumbers';
import Checkbox from '@mui/material/Checkbox';
import RitzSelection from '@/components/Ritz/RitzSelection';


const VersionNavigation = ({ orderId, setOpen, setVersionUpdated }: any) => {

    const router = useRouter();

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Version Name',
            cell: props => {
                return (
                <>
                        {editVersionId === props.row.original.id ? (
                            <>
                                <TextField
                                    name={"name"}
                                    id={"name"}
                                    value={versionName || props.row.original.name}
                                    // isRequired={true}
                                    onChange={handleOnChangeName}
                                    fullWidth
                                    size='small'
                                    autoFocus
                                />
                                <Box sx={{mt:1}}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isCheckboxChecked} 
                                                onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                                            />
                                        }
                                        label="If you want to create a copy of the previous version, select the version below."
                                    />
                                </Box>
                                {isCheckboxChecked && (
                                    <Box mt={2}>
                                        <InputLabel htmlFor={`consumption`}>Select the Version :</InputLabel>
                                        <RitzSelection
                                            id="state"
                                            name="state"
                                            optionValue="id"
                                            optionText="name"
                                            selectedValue={selectedVersionId}
                                            isRequired={true}
                                            size='small'
                                            options={versions}
                                            handleOnChange={handleChangeSelectedVersion}
                                        />
                                    </Box>
                                )}
                            </>
                        ) : (
                                <ListItemText onClick={() => handleVersionClick(props.row.original.id)} sx={{ cursor: 'pointer' }} >{props.row.original.name}</ListItemText>
                        )}
                </>
                )
            }
                
            },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => {
               return (
                <>
                       {editVersionId === props.row.original.id ? (
                           <IconButton
                               sx={{ ml: 1, px: 1.5 }}
                               size="small"
                               color="primary"
                               onClick={handleSave}
                           >
                               <SaveIcon fontSize="inherit" color='success' />
                           </IconButton>
                       ) : (
                           <IconButton
                               sx={{ ml: 1, px: 1.5 }}
                               size="small"
                               color="primary"
                               onClick={() => handleEditClick(props.row.original.id)}
                           >
                               <EditIcon fontSize="inherit" />
                           </IconButton>
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
    const [editVersionId, setEditVersionId] = useState(0);
    const [versions, setVersions] = useState<any>([]);
    const [versionName, setVersionName] = useState('');
    const [styleNumberModalOpen, setStyleNumberModalOpen] = useState(false);
    const [newVersion, setNewVersion] = useState(false);
    const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState(0);

    const handleChangeSelectedVersion = (event: any) => {
        setSelectedVersionId(event?.target.value);
    }

    const getVersions = () => {
        setIsLoading(true);
        api.get(RestUrls.varsionsURL(orderId)).then(resp => {
            const resdata = resp?.data || [];
            setVersions([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
         }).finally(() =>
             setIsLoading(false) 
        );
    };

    const handleVersionClick = (versionId: any) => {
        router.push(orderSummaryVersionURL(orderId, versionId));
        setOpen(false)
    }

    const handleOnChangeName = (event: any) => {
        setVersionName(event.target.value);
    }

    const handleEditClick = (versionId: number) => {
        setEditVersionId(versionId);
        setVersionName('')
        setNewVersion(false);
    };

    const handleNewRow = () => {
        setNewVersion(true);
        setEditVersionId(0);
        setVersionName('');
    }

    const handleSave  = () => {
        const existingVersionName = versions.find((version: { id: number; }) => version.id === editVersionId);
        const updatedVersionName = versionName || (existingVersionName ? existingVersionName.name : '');

        const versionData = {
            order: orderId,
            name: updatedVersionName,
            ...(editVersionId > 0 ? { version: editVersionId } : {})
        }
        const request = {
            method: editVersionId === 0 ? 'post' : 'put',
            url: editVersionId === 0 ? RestUrls.createVersionURL(orderId) : RestUrls.updateDetailVersionURL(orderId, editVersionId),
            data: versionData
        };
        api(request).then(() => {
            getVersions();
            setNewVersion(false);
            setVersionUpdated(true)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(()=>setEditVersionId(0));
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
                    onClick={handleNewRow}
                    variant="text"
                    size="small"
                    sx={{marginBottom: '1%', float: 'right', marginRight: '5px'}}
                >
                    Add Version
                </Button>
                <RitzTable
                data={newVersion ? [...versions, { id: 0, name: '', new: true }] : versions}
                columns={columns}
                enableGlobalFilter={false}
                enableColumnFilter={false} 
                pagination={false} />
                </>
            )}
        </>
        
  )
}

export default VersionNavigation