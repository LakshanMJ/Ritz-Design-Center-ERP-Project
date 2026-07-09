import RitzInput from "@/components/Ritz/RitzInput";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzQR from "@/components/Ritz/RitzQR";
import { getDefaultError } from "@/helpers/Utilities";
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import api from "@/services/api";
import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { batch } from "react-redux";
import RollDetails from "../club/RollDetails";

const CADTable3 = ({ clubId }: any) => {

    const [isLoading, setIsLoading] = useState(true)
    const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
    const [selectedBarcode,setSelectedBarcode] = useState(0);
    const [data, setData] = useState([]);
    const [uniqueWidthCategories, setUniqueWidthCategories] = useState([]);

    const fetchData = () => {
        api.get(POUrls.cadPurchaseOrderAllocatedMaterialListShadeGroup(clubId))
            .then(resp => {
                const responseData = resp?.data || [];
                setData(responseData);
                if (responseData.length > 0) {
                    setUniqueWidthCategories([...responseData[0].unique_widths]);
                }
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false))
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleBarcodeOnClick = (openState: boolean, barcode:any) => {
        setShowBarcodeDetails(openState);
        setSelectedBarcode(barcode);
    }

    return(
        <>
        { showBarcodeDetails &&
            <RitzModal open={showBarcodeDetails} title={''} onClose={() => setShowBarcodeDetails(false)} maxWidth='xs'>
                <Box sx={{m:2 , display:'flex', flexDirection:'row', justifyContent: 'center'}}>
                    <Box sx={{width:'150px', Height:'90px'}}>
                            <RitzQR value={selectedBarcode} size={150}/>
                    </Box>
                    <Box sx={{ml:2}}>
                    </Box>
                </Box>
            </RitzModal> 
        }

<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow
        sx={{
          backgroundColor: (theme) => theme.palette.grey[100],
          '&:last-child td, &:last-child th': { borderBottom: 0 },
        }}
      >
        <TableCell
          rowSpan={2}
          sx={{ border: '1px solid #D3D3D9', textAlign: 'center', verticalAlign: 'middle' }}
        >
          Shade Group
        </TableCell>
        <TableCell
          rowSpan={2}
          sx={{ border: '1px solid #D3D3D9', textAlign: 'center', verticalAlign: 'middle' }}
        >
          Delivery
        </TableCell>
        <TableCell
          colSpan={uniqueWidthCategories.length}
          sx={{ border: '1px solid #D3D3D9', textAlign: 'center', verticalAlign: 'middle' }}
        >
          Width Categories
        </TableCell>
      </TableRow>
      <TableRow
        sx={{
          backgroundColor: (theme) => theme.palette.grey[100],
          '&:last-child td, &:last-child th': { borderBottom: 0 },
        }}
      >
        {uniqueWidthCategories.map((category, index) => (
          <TableCell
            key={index}
            sx={{
              border: '1px solid #D3D3D9',
              textAlign: 'center',
              verticalAlign: 'middle',
            }}
          >
            {category.width}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>
      {data.map((shade, shadeIndex) => (
        <React.Fragment key={shadeIndex}>
          {shade.deliveries.map((delivery: any, deliveryIndex: any) => {
            const widthsGrouped = uniqueWidthCategories.map((category) => {
              const widths = delivery.widths.filter((width: any) => width.id === category.id);
              return widths.length > 0 ? widths[0] : null;
            });

            return (
              <React.Fragment key={`${shadeIndex}-${deliveryIndex}`}>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ border: '1px solid #D3D3D9' }}>
                    {deliveryIndex === 0 && shade.shade_group}
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ border: '1px solid #D3D3D9' }}>
                    {delivery.delivery_date}
                  </TableCell>

                 
                  {widthsGrouped.map((width, columnIndex) => (
                    <TableCell
                      key={columnIndex}
                      sx={{
                        border: '1px solid #D3D3D9',
                        width: `${50 / uniqueWidthCategories.length}%`,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                        
                      {width?.rolls?.length > 0 ? width.rolls.join(', ') : '-'}
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  {widthsGrouped.map((width, columnIndex) => (
                    <TableCell
                      key={columnIndex}
                      sx={{
                        border: '1px solid #D3D3D9',
                        width: `${50 / uniqueWidthCategories.length}%`,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      {width ? width.qty : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}
    </TableBody>
  </Table>
</TableContainer>
        </>
    );
};

export default CADTable3;