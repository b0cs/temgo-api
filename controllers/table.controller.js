// Créer une nouvelle table
export const createTable = async (req, res) => {
    const { cluster, number, capacity, space } = req.body;
    try {
        const newTable = new Table({ cluster, number, capacity, space });
        await newTable.save();
        res.status(201).json(newTable);
    } catch (error) {
        res.status(400).json({ message: 'Error creating table: ' + error.message });
    }
};

// Lire toutes les tables d'un cluster
export const getTables = async (req, res) => {
    const { clusterId } = req.params;
    try {
        const tables = await Table.find({ cluster: clusterId });
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving tables: ' + error.message });
    }
};

// Lire une table spécifique par son ID
export const getTableById = async (req, res) => {
    const { tableId } = req.params;
    try {
        const table = await Table.findById(tableId);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.status(200).json(table);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving table: ' + error.message });
    }
};

// Mettre à jour une table spécifique
export const updateTable = async (req, res) => {
    const { tableId } = req.params;
    const { number, capacity, isReserved, space } = req.body;
    try {
        const updatedTable = await Table.findByIdAndUpdate(
            tableId, 
            { number, capacity, isReserved, space },
            { new: true }
        );
        if (!updatedTable) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.status(200).json(updatedTable);
    } catch (error) {
        res.status(400).json({ message: 'Error updating table: ' + error.message });
    }
};

// Supprimer une table spécifique
export const deleteTable = async (req, res) => {
    const { tableId } = req.params;
    try {
        const deletedTable = await Table.findByIdAndDelete(tableId);
        if (!deletedTable) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.status(200).json({ message: 'Table deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting table: ' + error.message });
    }
};
