import { Breadcrumbs, Link, Typography } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';

interface Breadcrumb {
    url?: string,
    label: string
}

export const RitzBreadcrumbs = ({ items=[], title='' } : { items: Breadcrumb[], title?: any }) => (
    <>
        {items.length > 0 && (
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ mb: 1.5 }}
            >
                {items.map((bc: any, i: number) => 
                    <div key={i}>
                        {i === (items.length - 1) ? <Typography color='text.primary'>{bc.label}</Typography> : 
                        <Link underline='hover' color='inherit' component={NextLink} href={bc.url}>{bc.label}</Link>}
                    </div>
                )}
            </Breadcrumbs>
        )}
        {title && <Typography variant='h1'>{title}</Typography>}
    </>
)

export default RitzBreadcrumbs;