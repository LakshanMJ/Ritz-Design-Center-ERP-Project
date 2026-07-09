import RitzTable from "@/components/Ritz/RitzTable";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import RitzQR from "@/components/Ritz/RitzQR";

const ViewRollDetails = ({clubId, materialId}:any) => {

    const [data, setData] = useState([]);
    const [selectedRollType,setSelectedRollType] = useState('finalized')

    const rollDataColums: ColumnDef<any>[] = [
      {
        accessorKey: 'barcode',
        header: 'QR Code',
        cell: (props:any) => {
            return(
                <Box sx={{width:'50px', Height:'50px'}}>
                <RitzQR value={props.row.original?.barcode} size={150}/>
              </Box>
            )
          }
      },{
        accessorKey: 'roll_number',
        header: 'Roll Number',
      },{
        accessorKey: 'batch_number',
        header: 'Batch Number',
      },{
        accessorKey: 'normalized_allocated_quantity.quantity',
        header: 'Roll Length',
        cell: (props:any) => {
            return(
                `${props.row.original?.normalized_allocated_quantity.quantity} ${ props.row.original?.normalized_allocated_quantity.quantity_units_display}`
            )
          }
      },{
        accessorKey: selectedRollType === 'available' ? 'normalized_available_quantity.quantity' : 'normalized_used_quantity.quantity',
        header: selectedRollType === 'available' ? 'Available Quantity': 'Finalized Quantity',
        cell: (props:any) => {
            return(
                `${props.row.original?.normalized_available_quantity.quantity} ${ props.row.original?.normalized_available_quantity.quantity_units_display}`
            )
          },
      },{
        accessorKey: 'shade',
        header: 'Shade',
      },{
        accessorKey: 'width',
        header: 'Width',
        cell: (props:any) => {
            return(
                `${props.row.original?.width.quantity} ${ props.row.original?.width.quantity_units_display}`
            )
          },
      }
    ]

    const fetchRollData = (type:any) => {
        const requests = [
          api.get(poUrls.poClubMaterialRollList(clubId,materialId,type))
        ];
      
        Promise.all(requests)
          .then(([response]) => {
            const data = response?.data || [];
            setData(data);
            console.log(data,'datadatadatadata')
          })
          .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
          })
          .finally(() => {
          });
      };

const handleRollsViewOptionSelection = (event:any) => {
    const type = event.target.value
    setSelectedRollType(type)
    fetchRollData(type)
}

useEffect(() => {
    fetchRollData('finalized');
  }, []);

return (
    <>
        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            <ToggleButtonGroup
                color="primary"
                value={selectedRollType}
                exclusive
                onChange={handleRollsViewOptionSelection}
                aria-label="Platform"
                style={{ marginBottom: '20px' }} 
                >
                <ToggleButton 
                    key={'finalized'} 
                    style={{ marginRight: '10px', minWidth: '150px', maxWidth: '100%', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    value={'finalized'}>Finalized Rolls
                </ToggleButton>
                <ToggleButton 
                    key={'available'} 
                    style={{ marginRight: '10px', minWidth: '150px', maxWidth: '100%', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    value={'available'}>Available Rolls
                </ToggleButton>
            </ToggleButtonGroup> 
        </Box>
            <RitzTable 
                data={data}
                columns={rollDataColums}
            />
    </>
    
);
}
export default ViewRollDetails;