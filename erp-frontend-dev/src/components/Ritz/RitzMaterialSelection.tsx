import * as React from 'react';
import RitzTable from './RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Radio } from '@mui/material';
import { useState, useRef, useEffect } from 'react';
import api from '@/services/api';
import { poClubMaterialDetailsURL } from '@/helpers/constants/rest_urls/POUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '../DefaultLoader';

const RitzMaterialSelection = ({ customerBrandId, materialType, handleOnChange }: any) => {
    const tableRef = useRef(null);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
    const [tableCols, setTableCols] = useState<ColumnDef<any>[]>([]);
    const [materialDetails, setMaterialDetails] = useState<any>({});

    const fetchData = () => {
        setIsLoadingMaterials(true)
        const requests = [
            api.get(poClubMaterialDetailsURL(customerBrandId, materialType)),
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [material] = respData;
            setMaterialDetails({...material});
            makeTable(material?.headers);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoadingMaterials(false)
        });
    }

    const makeTable = (headers: any) => {
        const colDef: ColumnDef<any>[] = [
            {
                accessorKey: 'customer_brand_material_id',
                header: '',
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                cell: (props: any) => (
                    <Radio
                        checked={props.row.getIsSelected()}
                        onChange={props.row.getToggleSelectedHandler()}
                        sx={{ p: 0 }}
                    />
                ),
                meta: {
                    align: 'center',
                    width: 35
                }
            }
        ];

        headers?.map((header: any) => {
            if (!header.isAction) {
                colDef.push({
                    accessorKey: header.name,
                    header: header.label
                });
            }
        });
        setTableCols(colDef);
    }

    const onRowSelection =(selectionIndex: any)=>{
        const selected = tableRef?.current?.getSelectedRows();
            if (selected) {
                const selectedIndex = Object.keys(selected)[0];
                const selectedMaterial = materialDetails?.data[selectedIndex];
                handleOnChange(selectedMaterial?.customer_brand_material_id)
            }   
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <>
            {isLoadingMaterials ? (
                <DefaultLoader />
            ) : (
                <RitzTable
                    data={materialDetails?.data}
                    columns={tableCols}
                    tableRef={tableRef}
                    rowSelect
                    onRowSelect={(event: any)=>{onRowSelection(event)}}
                    columnFilterMode='search'
                />
            )}
            
        </>
    );
};

export default RitzMaterialSelection;