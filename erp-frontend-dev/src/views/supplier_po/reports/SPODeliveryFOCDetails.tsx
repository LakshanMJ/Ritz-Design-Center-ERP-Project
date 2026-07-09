import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Divider, IconButton, InputLabel, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { deliveryDateFOCDetails } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";

const SPOLeftoverDetails = ({ deliveryId }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [focDetails, setFocDetails] = useState<any>([]);
    const fetchData = () => {
        setIsLoading(true)
        const requests = [
          api.get(deliveryDateFOCDetails(deliveryId)),
        ]
        Promise.all(requests).then(response => {
          const [focDetails] = response.map((r: any) => r.data);
          setFocDetails(focDetails);
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
      };
    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    };

    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'attributes.material_label',
            header: 'Material',
        },
        {
            accessorKey: 'attributes.ritz_customer_brand_reference_code',
            header: 'Ritz Code',
        },
        {
            accessorKey: 'attributes.reference_code',
            header: 'Material Reference Code',
        },
        {
            accessorKey: 'attributes.reference_code',
            header: 'Quantity',
            cell: (props) => {
                const quantity = props.row.original.quantity?.quantity|| '--';
                const quantityUnit = props.row.original.quantity?.quantity_units_display || '--';
                return `${quantity} ${quantityUnit}`;

              },
        }
    ]

    useEffect(() => {
        if (deliveryId) {
          fetchData();
        }
      }, [deliveryId]);


    return (
        <>

            {isLoading ? <DefaultLoader /> : <>
                <RitzTable
                    columns={columns}
                    data={focDetails}
                />
            </>}
        </>
    );
};

export default SPOLeftoverDetails;
