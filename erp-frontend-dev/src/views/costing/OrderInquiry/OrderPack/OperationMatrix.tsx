
import { Card, Table, TableHead, TableContainer, TableCell, TableRow, TableBody, Box, Button, Alert } from '@mui/material';
import React, { useEffect, useState } from 'react';
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from '@/components/DefaultLoader';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';
import OrderItemOperation from '../OrderItemOperation';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import { COMPLETED_VERSION_STATE } from '@/helpers/constants/CostingStates';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { IE_USER } from '@/helpers/constants/RoleManager';


const OrderItemColorwayOperation = ({ orderId, versionId, versionData }: any) => {
    // Local states
    const [orderColorways, setOrderColorways] = useState<any>([]);
    const [orderItems, setOrderItems] = useState<any>([]);
    const [orderItemColorwayTypes, setOrderItemColorwayTypes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedColorwayTypeData, setSelectedColorwayTypeData] = useState<any>({ item_id: '', colorway_category_id: '', colorway_id: '' });
    const [completedStatus, setCompletedStatus] = useState(false);
    const canEdit = hasRole(IE_USER);

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderColorwayDetailsURL(orderId)),
            api.get(restUrls.updateOperationsMarkAsCompleteURL(versionId))
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderCwDetails, updateOperationsMarkAsCompleteURL] = respData;

            setOrderColorways(orderCwDetails['colorways']);
            setOrderItems(orderInquiry['items']);
            setOrderItemColorwayTypes(orderInquiry['colorway_item_types']);
            setCompletedStatus(updateOperationsMarkAsCompleteURL.operations_completed)

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleCellClick = (colorwayId: any, orderItemId: any, itemId: any, colorwayCategoryId: any) => {
        setSelectedColorwayTypeData({
            ...selectedColorwayTypeData,
            item_id: itemId,
            colorway_category_id: colorwayCategoryId,
            colorway_id: colorwayId,
            order_item_id: orderItemId,
        });
    }

    const handleCompletedSwitch = (event: any) => {
        setCompletedStatus(event.target.checked);
        const operations = restUrls.updateOperationsMarkAsCompleteURL(versionId);
        api.put(operations,{operations_completed:event.target.checked}).then(resp => {
          const resdata = resp?.data || {};
          toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
          setCompletedStatus(false)
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);


    return (
        <>{isLoading ? <DefaultLoader /> :
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                    <Alert severity='info'>
                        Click on item colorway type to view the item operation and if required move the operation to re-arrange the order of the operations.
                    </Alert>
                   

                </Box>
                <Card id={'colorway-category-holder'} sx={{ mb: 4 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    {orderColorways?.map((colorway: any, index: any) => (
                                        <TableCell key={index} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{colorway.colorway}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orderItems.map((item: any, index: number) => (
                                    <TableRow
                                        key={item.id}
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: (theme) => theme.palette.grey[50],
                                            },
                                            '&:last-child td, &:last-child th': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>{item.name}</TableCell>
                                        {orderColorways?.map((colorway: any, index: number) => (
                                            <TableCell
                                                key={`${colorway.id}_${item.id}`}
                                                align='center'
                                                sx={{
                                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                    cursor: 'pointer',
                                                    color: 'blue'
                                                }}

                                            >
                                                <Button onClick={() => handleCellClick(colorway.id, item.id, item.item, orderItemColorwayTypes?.find((itemCWType) => itemCWType?.item == item?.id && itemCWType?.colorway == colorway.id)?.colorway_category)}>
                                                    {orderItemColorwayTypes?.find((itemCWType) => itemCWType?.item == item?.id && itemCWType?.colorway == colorway.id)?.colorway_category_display}
                                                </Button>
                                                

                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
                {versionData?.version_state?.value !== COMPLETED_VERSION_STATE && canEdit && (
                        <Box sx={{ marginLeft: 'auto' }}>
                            <RitzSwitch name="Reviewed Operations" status={completedStatus} handleChangeSwitch={handleCompletedSwitch} />
                        </Box>
                    )}
                {selectedColorwayTypeData.colorway_category_id !== '' && (
                    <OrderItemOperation
                        itemId={selectedColorwayTypeData.item_id}
                        orderItemId={selectedColorwayTypeData.order_item_id}
                        colorwayCategoryd={selectedColorwayTypeData.colorway_category_id}
                        colorwayId={selectedColorwayTypeData.colorway_id}
                        versionId={versionId}
                    />
                )}

            </Box>



        }</>
    )
};

export default OrderItemColorwayOperation;