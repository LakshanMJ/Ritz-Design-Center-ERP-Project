import React, { useEffect, useState } from 'react';
import { Collapse, List, ListItem, ListItemText, ListSubheader } from '@mui/material';
import { grey } from '@mui/material/colors';
import { useRouter } from 'next/router';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { purchaseOrderMaterialPackItemURL, purchaseOrderMaterialPackURL } from '@/helpers/constants/FrontEndUrls';


const PurchaseOrderMaterialNavigation = ({ purchaseOrderId, navigationData, objectId }: any) => {
    const router = useRouter();

    const [open, setOpen] = useState([]);


    useEffect(() => {
        if (objectId !== undefined && objectId !== null) {
            const indexToExpandSection = navigationData .findIndex((list:any) => {
                if (list.pack_id === Number(objectId)) {
                    return true;
                } else if (list?.po_pack_items.some((item:any) => item?.po_pack_item_id === Number(objectId))) {
                    return true;
                }
                return false;
            });

            if (indexToExpandSection !== -1) {
                const newOpenState = [...open];
                newOpenState[indexToExpandSection] = true;
                setOpen(newOpenState);
            }
        }
    }, [objectId, navigationData ]);


    const collapseSubHeader = (index: number) => {
        const newOpenState = [...open];
        newOpenState[index] = !newOpenState[index];
        setOpen(newOpenState);
    };

    const handlePackItemClick = (pack_item_id: number) => {
        router.push(purchaseOrderMaterialPackItemURL(purchaseOrderId, pack_item_id));
    };

    const handlePackClick = (pack_id: number) => {
        router.push(purchaseOrderMaterialPackURL(purchaseOrderId, pack_id));
    };

    return (
        <>
            <List disablePadding={true}>
                {navigationData ?.map((list: any, index: number) => (
                    <React.Fragment key={`${index}`}>
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
                            {list.po_country} - {list.po_colorway} - {list.po_size}
                            {open[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ListSubheader>
                        <Collapse in={open[index]} timeout='auto' unmountOnExit>
                            {list?.po_pack_items.map((item: any, index2: number) => (
                                <React.Fragment key={index2}>
                                    <ListItem sx={{
                                        '&:hover': {
                                            backgroundColor: grey[100],
                                        },
                                        backgroundColor: Number(objectId) === item.po_pack_item_id ? grey[100] : 'inherit',
                                    }}>
                                        <ListItemText sx={{
                                            cursor: "pointer",
                                        }}
                                            onClick={() => {
                                                handlePackItemClick(item.po_pack_item_id);
                                            }}>
                                            {item.po_item_name}
                                        </ListItemText>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                            <React.Fragment key={list.po_pack_id}>
                                <ListItem sx={{
                                    '&:hover': {
                                        backgroundColor: grey[100],
                                    },
                                    backgroundColor: Number(objectId) === list.po_pack_id ? grey[100] : 'inherit',
                                }}>
                                    <ListItemText sx={{
                                        cursor: "pointer",
                                    }}
                                        onClick={() => {
                                            handlePackClick(list.po_pack_id);
                                        }}>
                                        Packaging
                                    </ListItemText>
                                </ListItem>
                            </React.Fragment>
                        </Collapse>
                    </React.Fragment>
                ))}
            </List>
        </>
    );
};

export default PurchaseOrderMaterialNavigation;
