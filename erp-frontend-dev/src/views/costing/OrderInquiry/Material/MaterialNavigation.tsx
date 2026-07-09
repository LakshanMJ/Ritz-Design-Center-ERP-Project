import React, { useEffect, useState } from "react";
import { Collapse, List, ListItem, ListItemButton, ListItemText, ListSubheader } from "@mui/material";
import { useRouter } from "next/router";
import {
    orderMaterialAssignURL,
    orderMaterialPackagingAssignURL,
    orderMaterialSupplierSelectURL, orderPackagingSuppliersSelectURL
} from "@/helpers/constants/FrontEndUrls";
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import {PENDING_SUPPLIER_SELECTION_VERSION_STATE} from "@/helpers/constants/CostingStates";
import {packMaterialSummaryUrl} from "@/helpers/constants/front_end/CostingUrls";

const MaterialNavigation = ({ navigationData, orderID, versionId, pageType, costingPhase }: any) => {
    const orderPackItemsKey = 'order_pack_items';
    const orderPacksKey = 'order_packs';

    const router = useRouter();
    const activeId = router?.query?.pack_item_id || -2;
    const [open, setOpen] = useState([]); // maintain collapse states

    const getSizeString = (sizes: any) => {
        let sizeString = '';
        sizes?.forEach((size: any, index: number) => {
            let trailVal = index - 1 < sizes.length - 2 ? ", " : " "
            sizeString += size?.abbreviation + trailVal
        });
        return sizeString;
    }

    const handleMaterialNavigationOnClick = (colorway_id: number, size_id: number, item_id: number, country_id: number) => {
       //alert(title)
        let orderPackItem = navigationData?.order_pack_items.find((orderPackItem: any) => {
            return orderPackItem.item_id == item_id && orderPackItem.size_id == size_id && orderPackItem.colorway_id == colorway_id && orderPackItem.country_id == country_id;
        });


        if (orderPackItem) {
            if (costingPhase == PENDING_SUPPLIER_SELECTION_VERSION_STATE) {
                router.push(orderMaterialSupplierSelectURL(orderID, orderPackItem?.id, versionId));
            } else {
                router.push(orderMaterialAssignURL(orderID, orderPackItem?.id, versionId));
            }
        }
    }

    const handleMaterialNavigationPackagingOnClick = (colorway_id: number, size_id: number, country_id: number) => {
        let orderPack = navigationData?.order_packs.find((orderPack: any) => {
            return orderPack.size == size_id && orderPack.colorway == colorway_id && orderPack.country == country_id;
        });
        if (orderPack) {
            if (costingPhase == PENDING_SUPPLIER_SELECTION_VERSION_STATE) {
                router.push(orderPackagingSuppliersSelectURL(orderID, orderPack?.id, versionId));
            } else {
                router.push(orderMaterialPackagingAssignURL(orderID, orderPack?.id, versionId));
            }
        }
    }

    const handlePackSummaryNavigationOnClick = (colorway_id: number, order_country_id: number, order_size_group_id: number) => {

        router.push(packMaterialSummaryUrl(orderID, versionId, order_country_id, colorway_id, order_size_group_id));
    }

    const collapseSubHeader = (index: number) => {
        const newState = [...open];
        newState[index] = !newState[index];
        setOpen(newState);
    }

    const collapseAll = (activeIndex: number) => {
        open.forEach((collapseState: boolean, index: number) => {
            if (activeIndex !== index) {
                open[index] = false;
            }
        })
    }
    
    const getActiveId = (colorway_id: number, size_id: number, item_id: number, country_id: number) => {
        return navigationData?.order_pack_items.find((orderPackItem: any) => {
            return orderPackItem.item_id == item_id && orderPackItem.size_id == size_id &&
                orderPackItem.colorway_id == colorway_id && orderPackItem.country_id == country_id && pageType == 'material';
        })?.id;
    }

    const getActiveIdOrderPack = (colorway_id: number, size_id: number, country_id: number) => {
        return navigationData?.order_packs.find((order_pack: any) => {
            return order_pack.size == size_id && order_pack.colorway == colorway_id && order_pack.country == country_id && pageType == 'packaging';
        })?.id;
    }

    const activeGroupedSummary = (colorway_id: any, country_id: any, size_group_id: any) => {
        const { order_country_id, order_colorway_id, order_size_group_id } = router.query;

        return colorway_id == order_colorway_id && country_id == order_country_id && order_size_group_id == size_group_id && pageType == 'summary';
    }

    const collapseActiveIdParent = () => {
        // collapse the active id's subheader
        navigationData?.order_pack_size_groups?.map((size_group_pack: any, index: number) => (
            size_group_pack?.order_sizes.map((size: any, index2: number) => (
                navigationData?.items?.map((order_item: any, index3: number) => {
                    let isActive = activeId == getActiveId(size_group_pack?.order_colorway?.id, size?.id, order_item?.id, size_group_pack?.order_country?.id)
                    if (pageType === 'packaging') {
                        isActive = activeId == getActiveIdOrderPack(size_group_pack?.order_colorway?.id, size?.id, size_group_pack?.order_country?.id);
                    }

                    console.log(activeGroupedSummary(size_group_pack?.order_colorway?.id, size_group_pack?.order_country?.id, size_group_pack?.size_group_id));
                    console.log(size_group_pack?.order_colorway?.id, size_group_pack?.order_country?.id, size_group_pack?.size_group_id);

                    if (activeGroupedSummary(size_group_pack?.order_colorway?.id, size_group_pack?.order_country?.id, size_group_pack?.size_group_id)) {
                        isActive = true;
                    }

                    if (isActive) {
                        const newState = [...open];
                        newState[index] = true;
                        setOpen(newState);
                    }
                })
            ))
        ));
    }

    useEffect(() => {
        collapseActiveIdParent();
    }, [navigationData]);

    const getOrderPackItem = (colorwayId: any, orderCountryId: any, orderSizeId: any, orderItemId: any) => {
        return navigationData?.[orderPackItemsKey].find((orderPackItem: any) => (
           orderPackItem?.['item_id'] == orderItemId && orderPackItem?.['colorway_id'] == colorwayId && orderPackItem?.['country_id'] == orderCountryId && orderPackItem?.['size_id'] == orderSizeId
        ));
    }

    const getOrderPack = (colorwayId: any, orderCountryId: any, orderSizeId: any) => {
        return navigationData?.[orderPacksKey].find((orderPack: any) => (
           orderPack?.['colorway'] == colorwayId && orderPack?.['country'] == orderCountryId && orderPack?.['size'] == orderSizeId
        ));
    }

    return (
        <List disablePadding={true}>
            {navigationData?.order_pack_size_groups?.map((size_group_pack: any, index: number) => (
                <React.Fragment key={`${index}`}>
                    {<ListSubheader
                        onClick={() => collapseSubHeader(index)}
                        disableSticky={true}
                        sx={{
                            backgroundColor: (theme) => open[index] ? theme.palette.grey[100] : theme.palette.grey[50],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                            lineHeight: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            py: 1
                        }}
                    >
                        {size_group_pack?.order_country?.name} - {size_group_pack?.order_colorway?.name} - {getSizeString(size_group_pack?.order_sizes)} Packs
                        {open[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListSubheader>}
                    <Collapse in={open[index]} timeout='auto' unmountOnExit>
                        {size_group_pack?.order_sizes.map((size: any, index2: number) => (
                            <React.Fragment key={index2}>
                                <ListItem>
                                    <ListItemText
                                        primaryTypographyProps={{
                                            fontWeight: 'bold',
                                            paddingBottom: 1
                                        }}
                                        sx={{
                                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                        }}
                                        primary={`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway.name} - ${size?.abbreviation} Pack`} />
                                </ListItem>
                                {navigationData?.items?.map((order_item: any, index3: number) => (
                                    <ListItem key={`${index}_${index2}_${index3}`} sx={{ py: 0 }}>
                                        <ListItemButton
                                            disableRipple={false}
                                            sx={{
                                                background: (theme) => activeId == getActiveId(size_group_pack?.order_colorway?.id, size?.id, order_item?.id, size_group_pack?.order_country?.id) ? theme.palette.grey[200] : 'none'
                                            }}
                                            onClick={() => [
                                                collapseAll(index),
                                                handleMaterialNavigationOnClick(
                                                    size_group_pack?.order_colorway?.id,
                                                    size?.id,
                                                    order_item?.id,
                                                    size_group_pack?.order_country?.id,
                                                )
                                            ]}
                                        >
                                            <ListItemText
                                                // primary={`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway.name} - ${size?.abbreviation} - ${order_item?.name}`}
                                                primary={`${order_item?.name} (${navigationData?.item_colorway_categories?.[size_group_pack?.order_colorway.id]?.items?.[order_item?.id]?.colorway_category}) `}
                                            />
                                            <ReviewStatus status={getOrderPackItem(size_group_pack?.order_colorway.id, size_group_pack?.order_country.id, size?.id, order_item?.id)?.['reviewed']}/>
                                        </ListItemButton>
                                    </ListItem>
                                ))}

                                <ListItem sx={{ py: 0, mb: (size_group_pack?.order_sizes?.length - 1) === index2 ? 2 : 0 }}>
                                    <ListItemButton
                                        disableRipple={false}
                                        sx={{
                                            background: (theme) => activeId == getActiveIdOrderPack(size_group_pack?.order_colorway?.id, size?.id, size_group_pack?.order_country?.id) ? theme.palette.grey[200] : 'none'
                                        }}
                                        onClick={() => [
                                            collapseAll(index),
                                            handleMaterialNavigationPackagingOnClick(
                                                size_group_pack?.order_colorway?.id,
                                                size?.id,
                                                size_group_pack?.order_country?.id,
                                            )
                                        ]}
                                    >
                                        <ListItemText primary={`Packaging`}></ListItemText>
                                        <ReviewStatus status={getOrderPack(size_group_pack?.order_colorway.id, size_group_pack?.order_country.id, size?.id)?.['reviewed']}/>
                                    </ListItemButton>
                                </ListItem>
                            </React.Fragment>
                        ))}

                        <ListItem>
                            <ListItemText
                                primaryTypographyProps={{
                                    fontWeight: 'bold',
                                    paddingBottom: 1
                                }}
                                sx={{
                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                }}
                                primary={`Size Group Summary`} />
                        </ListItem>

                        <ListItem key={`${index}-packs-summary`} sx={{ py: 0 }}>
                                <ListItemButton
                                    disableRipple={false}
                                    sx={{
                                        background: (theme) => activeGroupedSummary(
                                            size_group_pack?.order_colorway?.id, size_group_pack?.order_country?.id, size_group_pack?.size_group_id) ? theme.palette.grey[200] : 'none'
                                    }}
                                    onClick={() => [
                                        collapseAll(index),
                                        handlePackSummaryNavigationOnClick(
                                            size_group_pack?.order_colorway?.id,
                                            size_group_pack?.order_country?.id,
                                            size_group_pack?.size_group_id,
                                        )
                                    ]}
                                >
                                    <ListItemText
                                        // primary={`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway.name} - ${size?.abbreviation} - ${order_item?.name}`}
                                        primary={`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway.name} - ${getSizeString(size_group_pack?.order_sizes)} - Pack Summary`}
                                    />
                                </ListItemButton>
                            </ListItem>
                    </Collapse>
                </React.Fragment>
            ))}
        </List>
    );
};

export default MaterialNavigation;
