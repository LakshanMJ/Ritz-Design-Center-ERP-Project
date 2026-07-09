import { Collapse, List, ListItem, ListItemButton, ListSubheader } from '@mui/material'
import React from 'react'

const EditPurchaseOrderMaterialsNavigation = ({navigationData, selectedNavigationData, currentCountryId, currentColorwayId}: any) => {

  const handleMaterialNavigationOnClick = (selectedMaterialNavigationData: any) => {
    selectedNavigationData(selectedMaterialNavigationData)
  }

  return (
    <List disablePadding >
       <ListSubheader
       disableSticky={true}
       sx={{
         backgroundColor: (theme) => theme.palette.grey[100],
         borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
         lineHeight: 'inherit',
         cursor: 'pointer',
         display: 'flex',
         justifyContent: 'space-between',
         py: 1,
       }}
       >Colorway Packs</ListSubheader>
      {navigationData.map((packItem: any) => {
      const allSizes = [...new Set(packItem.po_sizes.map((packSize: any) => packSize.po_size_name))];
      const isSelected = packItem.po_country_id === currentCountryId && packItem.po_colorway_id === currentColorwayId;
      return (
        <ListItemButton
        key={packItem.po_colorway_id}
         disableRipple={false}
         onClick={() => {handleMaterialNavigationOnClick(packItem)}}
         sx={{
            p : 2,
            backgroundColor: isSelected ? (theme) => theme.palette.grey[200] : 'inherit',
         }}
        >
          {`${packItem.po_country} - ${packItem.po_colorway} - ${allSizes.join(', ')} Packs `}
        </ListItemButton>
      )
    })}
    </List>
  )
}

export default EditPurchaseOrderMaterialsNavigation