import RitzTable from "@/components/Ritz/RitzTable";
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import DefaultLoader from "@/components/DefaultLoader";

const PlantWisePODetails = ({modalStatus,onPoClubSelect,plantSelected,selectedCustomerNew}:any) => {

  const [factoryPODetails,setFactoryPODetails] = useState(null);
  const [isLoading, setIsLoading] = React.useState(true);    

  const handleClubOnClick = (displayValue:any, poClubId:any) => {
    modalStatus(true)
    onPoClubSelect({po_display: displayValue,club_id: poClubId})
  }

const loadPOClubDetails = (customerId:any) => {
    setIsLoading(true)
    if (customerId !== null){
      api.get(poUrls.FactoryCustomerWisePoClubsURL(plantSelected, customerId)).then(resp => {
            const resdata = resp?.data || [];
            setFactoryPODetails([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
      }
};

useEffect(() => {
  if (selectedCustomerNew) {
    loadPOClubDetails(selectedCustomerNew.id)
  }
}, [selectedCustomerNew]);

const poColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'id',
        header: 'PO Club Number',
        cell: (props) => {
          const displayValue = props.row.original.display_number || '--';
          return (
            <Link component="button" onClick={() => handleClubOnClick(displayValue,props.row.original.id)}>{displayValue}</Link>)}
    },
    {
        accessorKey: 'po.display_value',
        header: 'Purchase Order(s)',
        cell: (props) => {
          const displayValue = props.row.original.purchaseorder_set || '--';
          const poNames = displayValue.map((po:any) => (po.display_number));
          const joinedNames = poNames.join(',<br />');
        return <Typography dangerouslySetInnerHTML={{ __html: joinedNames }} />
        }
    },
    {
        accessorKey: 'state.display_value',
        header: 'Status',
    }
]

  return (
    <>
             {isLoading ? <DefaultLoader/> : <>
                <RitzTable data={factoryPODetails} columns={poColumns}/> 
              </>}
    </>
  );
}

export default PlantWisePODetails;