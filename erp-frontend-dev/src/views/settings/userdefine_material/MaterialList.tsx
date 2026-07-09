import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Link, Typography } from '@mui/material';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import AddMaterial from "./AddMaterial";
import { materialDetailURL } from "@/helpers/constants/front_end/AdminUrls";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import NextLink from 'next/link';
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const UserDefineMaterialListView = () => {
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'material',
            header: 'Material',
            cell: (props) => (
                <Link component={NextLink} href={materialDetailURL(props.row.getValue('id'))}>{props.row.getValue('material') ?? ''}</Link>
            )
        },
        {
            accessorKey: "category",
            header: 'Material Type',
            cell: (props) => (
                props.row.getValue('material') // === 'packaging_trim' ? 'Packaging' : 'Sewing Trims'
            )
        },
        {
            accessorKey: "get_category_display",
            header: 'Category',
        },
        {
            accessorKey: "id",
            header: 'Edit',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => toggleModal("edit", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const [isOpen, setIsOpen] = useState(false);
    const [modalType, setModalType] = useState<string>();
    const [editMaterialId, setEditMaterialId] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [materialData, setMaterialData] = useState<any>([]);

    const toggleModal = (modalType: string, materialId: any) => {
        setModalType(modalType);
        setEditMaterialId(materialId);
        setIsOpen(true);
    }

    const getData = () => {
        setIsLoading(true);

        api.get(RestUrls.getUserDefineMaterialsURL()).then(resp => {
            const resdata = resp?.data || [];
            setMaterialData([...resdata]);
        }).catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        getData();
    }, []);

    return (
        <>
            <Typography variant='h1'>Material List</Typography>

            {isLoading && <DefaultLoader />}

            {!isLoading && (
                <>
                    <Box>
                        <Button variant='contained' onClick={() => toggleModal("add", 0)}>Add Material</Button>
                    </Box>

                    <RitzTable
                        data={materialData}
                        columns={columns}
                    />
                        
                    {isOpen && (
                        <AddMaterial
                            open={isOpen}
                            onClose={() => setIsOpen(false)}
                            action={modalType}
                            materialId={editMaterialId}
                            refreshData={getData}
                        />
                    )}
                </>
            )}
        </>
    );
};

export default UserDefineMaterialListView;
