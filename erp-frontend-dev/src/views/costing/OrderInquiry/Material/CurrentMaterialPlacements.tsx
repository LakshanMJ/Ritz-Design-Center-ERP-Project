// CurrentMaterialPlacements.js
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import {toggleSelection} from "@mui/base/useList";


const CurrentMaterialPlacements = ({ otherPlacements, type, tableRef, selectedColorwayId }: any) => {
    let tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    sx={{ p: 0 }}
                />
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: (props: any) => (
                <Checkbox
                    checked={props.row.getIsSelected()}
                    onChange={props.row.getToggleSelectedHandler()}
                    sx={{ p: 0 }}
                />
            ),
            meta: {
                align: 'center',
                width: 35
            }
        },
        {
            accessorKey: 'placement_name',
            header: 'Placement'
        },
        {
            accessorKey: 'country',
            header: 'Country'
        },
        {
            accessorKey: 'colorway',
            header: 'Colorway'
        },
        {
            accessorKey: 'size',
            header: 'Size'
        },
        {
            accessorKey: 'item_display',
            header: 'Item'
        },
    ];

    if (type === 'orderpack') {
        tableCols = tableCols.filter((i: any) => i.header !== 'Item');
    }

    return (
        <>
            {/* <Typography variant='h6' sx={{ mt: 5 }}>Select Reviewed Placements to Apply this Change</Typography> */}
            <Typography sx={{marginTop: '15px'}}>Select Other Pack Items to Apply this Change</Typography>
            <RitzTable
                data={otherPlacements}
                columns={tableCols}
                tableRef={tableRef}
                rowSelect
                multiRowSelect
                columnSearch
                columnFilterMode='search'
                pagination={false}
            />
        </>
    );
};

export default CurrentMaterialPlacements;
