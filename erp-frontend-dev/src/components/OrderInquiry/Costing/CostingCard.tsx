import { Card } from "@mui/material";

function CostingCard(props: any) {
    return (
        <Card sx={{
            p: 3,
            mb: 4
        }}>
            {props?.children}
        </Card>
    )
}

export default CostingCard;