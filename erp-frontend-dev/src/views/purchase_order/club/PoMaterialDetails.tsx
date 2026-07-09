import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as restUrls from "@/helpers/constants/rest_urls/POUrls";

const POFabricMaterialDetails = ({ clubId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseOrderFabricDetails, setPurchaseOrderFabricDetails] = useState({});
  const [purchaseOrderClubColorwayDetails, setPurchaseOrderClubColorwayDetails] = useState<any>({});

  console.log(purchaseOrderFabricDetails,"purchaseOrderFabricDetails");

  const fetchData = () => {
    if (clubId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(restUrls.poFabricMaterialDetailsURL(clubId)),
        api.get(restUrls.poActualClubColorwayMatrixDetailsURL(clubId))
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [poFabricDetails, poClubColorwayDetails] = respData
          setPurchaseOrderFabricDetails({ ...poFabricDetails });
          setPurchaseOrderClubColorwayDetails({...poClubColorwayDetails})
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubId]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
      <TableContainer>
        <React.Fragment>
        <Card variant="outlined" sx={{ mb: 3, mt: 1}}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                {purchaseOrderClubColorwayDetails?.item_data?.map((item: any, index: any) => (
                  <TableCell key={index}>
                    {item.item_name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
            {Object.values(purchaseOrderClubColorwayDetails).map((order: any, index: any, item: any) => (
                <React.Fragment key={index}>
                    <TableRow key={index} sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                      {index !== item.length - 1 && (
                        <TableCell colSpan={5} sx={{ fontWeight: 'bold' }}>{order.po_display_number}</TableCell>
                      )}
                    </TableRow>
                  {order.po_colorway_mappings
                    ?.filter((colorway: any, index2: any, array: any) => {
                      const currentIndex = array.findIndex(
                        (c: any) => c.po_colorway_id === colorway.po_colorway_id && c.order_colorway === colorway.order_colorway
                      );
                      return currentIndex === index2;
                    })
                    .map((uniqueColorway: any, uniqueIndex: any) => (
                      <React.Fragment key={uniqueIndex}>
                        <TableRow sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                          <TableCell>
                            <Typography sx={{ marginLeft: '2rem' }}>{uniqueColorway.po_colorway} [{uniqueColorway.order_colorway}]</Typography>
                          </TableCell>
                          {purchaseOrderClubColorwayDetails?.item_data?.map((item: any, itemIndex: any) => {
                            const categoryDisplay = order.po_colorway_mappings
                              ?.filter((mapping: any) => mapping.item_id === item?.item_id && mapping.po_colorway_id === uniqueColorway.po_colorway_id && mapping.order_colorway === uniqueColorway.order_colorway)
                              .map((mapping: any) => mapping.cw_item_category_display)
                              .join(', ');
                          
                            return (
                              <TableCell key={itemIndex}>
                                {categoryDisplay}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </React.Fragment>
                    ))}
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
        </Card>
        </React.Fragment>
      </TableContainer>
      <TableContainer>
        {Object.keys(purchaseOrderFabricDetails).map((poNumber) => (
          <React.Fragment key={poNumber}>
            <Card variant="outlined" sx={{ mb: 3, mt: 1 }}>
            <CardHeader
                title={purchaseOrderFabricDetails[poNumber].po_display_number}
                sx={{
                  // background: (theme) => theme.palette.grey[100],
                  fontWeight: 'bold',
                  borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                }}
              ></CardHeader>
              <Table key={poNumber} aria-label="simple table">
              <TableBody>
                {purchaseOrderFabricDetails[poNumber].pack_item_fabrics.map((fabric: any, index: any) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell sx={{ backgroundColor: (theme) => theme.palette.grey[100]}} colSpan={purchaseOrderFabricDetails[poNumber].headers?.length + 1} >{fabric.po_pack_item_display}</TableCell>
                    </TableRow>
                    <TableRow>
                      {purchaseOrderFabricDetails[poNumber].headers.map((header: any, headerIndex: any) => (
                        <TableCell key={headerIndex} style={{ fontWeight: 'bold' }}>{header.label}</TableCell>
                      ))}
                    </TableRow>
                    {fabric.data.map((dataItem: any, dataIndex: any) => (
                      <TableRow key={dataIndex}>
                        {purchaseOrderFabricDetails[poNumber].headers.map((header: any, headerIndex: any) => (
                          <TableCell key={headerIndex} >{dataItem[header.name]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            </Card>
          </React.Fragment>
        ))}
      </TableContainer>
        </>
      )}
    </>
  );
};

export default POFabricMaterialDetails;
