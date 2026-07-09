import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { Alert, Box, Button, Checkbox, IconButton, Tooltip, Typography } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from "@/components/Ritz/RitzModal";
import ActualSupplierData from "@/views/purchase_order/club/ActualSupplierData";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InfoIcon from '@mui/icons-material/Info';

const GeneralPoBOMDetails = ({ generalPOId }: any) => {

  const router = useRouter();
  const [selectedMaterialBomData, setSelectedMaterialBomData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const tableColsSelectedMaterial: ColumnDef<any>[] = [
    {
      header: 'Delivery Date Status',
      cell: (props) => {
        const deliveryDate = props.row.original?.delivery_date_status
        if (deliveryDate === true) {
          return <CheckIcon sx={{ color: 'green' }} />
        } else {
          return <CloseIcon sx={{ color: 'red' }} />
        }

      },
    },
    {
      accessorKey: 'material_details.attributes.material_label',
      header: 'Material'
    },
    {
      accessorKey: 'material_details.attributes.material_label',
      header: 'Ritz Reference Code',
      cell: ({ row }: any) => {
        const materialHeaders = row?.original?.material_details?.headers;
        const materialDetails = row?.original?.material_details?.attributes;
        return (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography sx={{ mr: 1 }}>{row?.original?.material_details?.attributes?.ritz_customer_brand_reference_code}</Typography>
              <Tooltip arrow title={
                <Box>
                  {materialHeaders.map((header: any, headerIndex: number) => (
                    <Typography key={headerIndex}>{header.label} : {materialDetails[header.name]}</Typography>
                  ))}
                </Box>
              }>
                <InfoIcon fontSize="small" sx={{ opacity: '60%' }} />
              </Tooltip>
            </Box>
          </>
        );
      }
    },
    {
      accessorKey: 'material_details.attributes.reference_code',
      header: 'Customer Reference Code'
    },
    {
      accessorKey: 'supplier_name',
      header: 'Supplier'
    },
    {
      accessorKey: 'order_quantity',
      header: 'Quantity',
      cell: (props) => {
        const quantity = props.row.original.order_quantity;
        const quantityUnit = props.row.original.order_quantity_units_display;
        return `${quantity} ${quantityUnit}`;


      },
    }
  ];
  const fetchPurchaseOrderPacks = () => {
    const requests = [
      api.get(poRestUrls.generalPOBOMMaterialDetailsURL(generalPOId)),
    ];
    Promise.all(requests).then(response => {
      const respData = response.map(r => r.data);
      const [bomData] = respData;
      const selectedMaterialBomData = bomData.filter((item: { delivery_date_status: boolean; }) => item.delivery_date_status === true);
      setSelectedMaterialBomData([...selectedMaterialBomData]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  }

  useEffect(() => {
    if (generalPOId) {
      fetchPurchaseOrderPacks();
    }
  }, [generalPOId]);

  return (
    <>

      {isLoading ? <DefaultLoader /> :
        <>
          <Box>
            <RitzTable columns={tableColsSelectedMaterial} data={selectedMaterialBomData} />
          </Box>
        </>
      }

    </>
  )
}

export default GeneralPoBOMDetails;
