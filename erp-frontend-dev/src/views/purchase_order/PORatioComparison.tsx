import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { grey } from '@mui/material/colors'

const PORatioComparison = ({ RatioComparisonData }: any) => {
    return (
        <>
        {Object.values(RatioComparisonData).map((colorway: any, cwIndex: number) => (
            Object.values(colorway.order_country_id).map((country: any, countryIndex) => (
                <TableContainer key={`${cwIndex}-${countryIndex}`} sx={{marginTop: '20px', borderRadius: '5px', border: (theme) =>  `1px solid ${theme.palette.divider}`}}>
                        <Table sx={{minWidth: 650,}} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        colSpan={(country?.costing_quantities?.length || 0) + 1}>{colorway.colorway_name} - {country.order_country_name}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                               <TableRow >
                                    <TableCell></TableCell>
                                    {country.costing_quantities.map((size: any, costingQuantityIndex: number ) => (
                                            <TableCell key={`${cwIndex}-${countryIndex}-${costingQuantityIndex}-size_header`} style={{ fontWeight: 'bold' }}>
                                                {size.order_size_name}
                                            </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow sx={{ "&:hover": { backgroundColor: grey[100]}}}>
                                    <TableCell>{colorway.colorway_name} (Costing Quantities)</TableCell>
                                    {country.costing_quantities.map((size: any, costingQuantityIndex2: number ) => (
                                            <TableCell key={`${cwIndex}-${countryIndex}-${costingQuantityIndex2}-costing-quantities`} >
                                                {size.estimated_quantity}
                                            </TableCell>
                                    ))}
                                </TableRow>
                            {country?.po_colorways?.map((poColorways: any, poQuantityIndex: number ) => (
                                        <TableRow key={`${cwIndex}-${countryIndex}-${poQuantityIndex}-po-colorways`} sx={{ 
                                            "&:hover": { backgroundColor: grey[100]},
                                            border: '1px solid #EEEEEE'
                                        }}>
                                            <TableCell >
                                                {poColorways.po_colorway_name}
                                            </TableCell>
                                            {
                                                poColorways.po_size_quantities.map((poCWSize: any, poCWSizeIndex: number) => (
                                                    <TableCell key={`${cwIndex}-${countryIndex}-${poQuantityIndex}-${poCWSizeIndex}-po-colorway-size-quantities`}>
                                                        {poCWSize?.po_quantity || "N/A"}
                                                    </TableCell>
                                                ))
                                            }
                                        </TableRow>
                                    ))}
                            {/* loop quantity on each size column cells */}
                            {/* {country.po_quantities.map((poColorways: any, poQuantityIndex: number) => (
                                <TableRow key={`${cwIndex}-${countryIndex}-${poQuantityIndex}-po-colorways`}>
                                    <TableCell>{poColorways.po_colorway_name}</TableCell>
                                    {country.costing_quantities.map((sizes: any, costingQuantityIndex3: any) => (
                                        <React.Fragment key={sizes.order_size_id} >
                                            {poColorways.po_size_quantities.map((quantity: any, poCWQunantityIndex: any) => (
                                                <TableCell key={`${cwIndex}-${countryIndex}-${poQuantityIndex}-${costingQuantityIndex3}-${poCWQunantityIndex}-po-colorway-size-quantities`} >
                                                    {quantity.order_size_name === sizes.order_size_name
                                                        ? quantity.quantity
                                                        : 'N/A'}
                                                </TableCell>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            ))} */}
                            </TableBody>
                        </Table>
                </TableContainer>
            )))
        )}
        </>

    )
}

export default PORatioComparison;
