import React, { useEffect, useState } from 'react';
import { Collapse, List, ListItem, ListItemText, ListSubheader } from '@mui/material';
import { grey } from '@mui/material/colors';
import { useRouter } from 'next/router';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as frontEndUrls from '@/helpers/constants/front_end/POUrls';
import {poColorwayCountryPackagingMaterialUrl} from "@/helpers/constants/front_end/POUrls";
import {ReactKeyHelper} from "@/helpers/KeyHelper";


const POCountryColorwayNavigation = ({ purchaseOrderId, navigationData, objectId }: any) => {
    const router = useRouter();

    const [open, setOpen] = useState([]);
    const keyHelper = new ReactKeyHelper();

    // useEffect(() => {
    //     if (objectId !== undefined && objectId !== null) {
    //         const indexToExpandSection = navigationData .findIndex((list:any) => {
    //             if (list.pack_id === Number(objectId)) {
    //                 return true;
    //             } else if (list.pack_items.some((item:any) => item.pack_item_id === Number(objectId))) {
    //                 return true;
    //             }
    //             return false;
    //         });
    //
    //         if (indexToExpandSection !== -1) {
    //             const newOpenState = [...open];
    //             newOpenState[indexToExpandSection] = true;
    //             setOpen(newOpenState);
    //         }
    //     }
    // }, [objectId, navigationData ]);

    useEffect(() => {
        setOpen([true,])
    }, [purchaseOrderId]);

    const collapseSubHeader = (index: number) => {
        const newOpenState = [...open];
        newOpenState[index] = !newOpenState[index];
        setOpen(newOpenState);
    };

    const handlePackItemClick = (poItemId: number, poColorwayId: number, poCountryId: number) => {
        router.push(frontEndUrls.poColorwayCountryItemMaterialUrl(purchaseOrderId, poColorwayId, poCountryId, poItemId));
    };

    const handlePackClick = (poColorwayId: number, poCountryId: number) => {
        router.push(poColorwayCountryPackagingMaterialUrl(purchaseOrderId, poColorwayId, poCountryId));
    };

    return (
        <>
            <List disablePadding={true}>
                {navigationData?.['po_colorway_countries']?.map((poColorwayCountry: any, index: number) => (
                    <React.Fragment key={keyHelper.getNextKeyValue()}>
                        <ListSubheader
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
                            {poColorwayCountry?.['po_colorway_name']} - {poColorwayCountry?.['po_country_name']}
                            {open[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ListSubheader>
                        <Collapse in={open[index]} timeout='auto' unmountOnExit>
                            {navigationData?.['po_items'].map((poItem: any, poItemIndex: number) => (
                                <React.Fragment key={keyHelper.getNextKeyValue()}>
                                    <ListItem sx={{
                                        '&:hover': {
                                            backgroundColor: grey[100],
                                        },
                                        //backgroundColor: Number(objectId) === item.pack_item_id ? grey[100] : 'inherit',
                                    }}>
                                        <ListItemText sx={{
                                            cursor: "pointer",
                                        }}
                                            onClick={() => {
                                                handlePackItemClick(poItem.po_item_id, poColorwayCountry.po_colorway_id, poColorwayCountry.po_country_id);
                                            }}>
                                            {poItem?.['po_item_name']}
                                        </ListItemText>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                                <ListItem sx={{
                                    '&:hover': {
                                        backgroundColor: grey[100],
                                    },
                                    //backgroundColor: Number(objectId) === list.pack_id ? grey[100] : 'inherit',
                                }}>
                                    <ListItemText sx={{
                                        cursor: "pointer",
                                    }}
                                        onClick={() => {
                                            handlePackClick(poColorwayCountry.po_colorway_id, poColorwayCountry.po_country_id);
                                        }}>
                                        Packaging
                                    </ListItemText>
                                </ListItem>
                        </Collapse>
                    </React.Fragment>
                ))}
            </List>
        </>
    );
};

export default POCountryColorwayNavigation;
