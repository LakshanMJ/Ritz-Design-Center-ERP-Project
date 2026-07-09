import React, { useEffect, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader'
import { Button, Card, CardContent, CardHeader, IconButton, List, ListItem, ListItemText, TextField } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import api from "@/services/api";
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { grey } from '@mui/material/colors';
import { useRouter } from 'next/router';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';


const OrderStyleNumbers = ({ orderId }: any) => {

    const router = useRouter();

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Style Number',
            cell: props => {
                return (
                <>
                        {editStyleNumberId === props.row.original.id ? (
                            <>
                                <TextField
                                    name={"name"}
                                    id={"name"}
                                    value={styleNumberName || props.row.original.style_number}
                                    // isRequired={true}
                                    onChange={handleOnChangeName}
                                    fullWidth
                                    size='small'
                                    autoFocus
                                />
                            </>
                        ) : (
                            <ListItemText sx={{ cursor: 'pointer' }} >{props.row.original.style_number}</ListItemText>
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
                       {editStyleNumberId === props.row.original.id ? (
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
    const [editStyleNumberId, setEditStyleNumberId] = useState(0);
    const [styleNumbers, setStyleNumbers] = useState<any>([]);
    const [styleNumberName, setStyleNumberName] = useState('');
    const [newStyleNumber, setNewStyleNumber] = useState(false);

    const getStyleNumbers = () => {
        setIsLoading(true);
        api.get(RestUrls.styleNumbersURL(orderId)).then(resp => {
            const resdata = resp?.data || [];
            setStyleNumbers([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
         }).finally(() =>
             setIsLoading(false) 
        );
    };

    const handleOnChangeName = (event: any) => {
        setStyleNumberName(event.target.value);
    }

    const handleEditClick = (styleNumberId: number) => {
        setEditStyleNumberId(styleNumberId);
        setStyleNumberName('')
        setNewStyleNumber(false);
    };

    const handleNewRow = () => {
        setNewStyleNumber(true);
        setEditStyleNumberId(0);
        setStyleNumberName('');
    }

    const handleSave  = () => {
        const existingStyleNumberName = styleNumbers.find((styleNumber: { id: number; }) => styleNumber.id === editStyleNumberId);
        const updatedStyleNumberName = styleNumberName || (existingStyleNumberName ? existingStyleNumberName.name : '');

        const styleNumberData = {
            order_inquiry: orderId,
            style_number: updatedStyleNumberName,
            ...(editStyleNumberId > 0 ? { styleNumber: editStyleNumberId } : {})
        }
        const request = {
            method: editStyleNumberId === 0 ? 'post' : 'put',
            url: editStyleNumberId === 0 ? RestUrls.createStyleNumberURL() : RestUrls.updateStyleNumberDetailURL(editStyleNumberId),
            data: styleNumberData
        };
        api(request).then(() => {
            getStyleNumbers();
            setNewStyleNumber(false);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(()=>setEditStyleNumberId(0));
    }

    useEffect(() => {
        if (orderId) {
            getStyleNumbers();
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
                    Add Style Number
                </Button>
                <RitzTable
                data={newStyleNumber ? [...styleNumbers, { id: 0, name: '', new: true }] : styleNumbers}
                columns={columns}
                enableGlobalFilter={false}
                enableColumnFilter={false} 
                pagination={false} />
                </>
            )}
        </>
        
  )
}

export default OrderStyleNumbers