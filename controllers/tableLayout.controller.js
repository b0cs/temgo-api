// Controller for creating a new table layout
export const createLayout = async (req, res) => {
    const { clusterId, layoutItems, spaceName } = req.body;
    try {
        const newLayout = new TableLayout({
            clusterId,
            layoutItems,
            spaceName
        });
        await newLayout.save();
        res.status(201).json(newLayout);
    } catch (error) {
        res.status(400).json({ message: "Failed to create layout: " + error.message });
    }
};

// Controller for fetching all table layouts for a specific cluster
export const getLayoutByCluster = async (req, res) => {
    const { clusterId } = req.params;
    try {
        const layouts = await TableLayout.find({ clusterId });
        res.status(200).json(layouts);
    } catch (error) {
        res.status(404).json({ message: "Layouts not found: " + error.message });
    }
};

// Controller for fetching a specific layout by ID
export const getLayoutById = async (req, res) => {
    const { layoutId } = req.params;
    try {
        const layout = await TableLayout.findById(layoutId);
        if (!layout) {
            return res.status(404).json({ message: "Layout not found" });
        }
        res.status(200).json(layout);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving layout: " + error.message });
    }
};

// Controller for updating a specific layout
export const updateLayout = async (req, res) => {
    const { layoutId } = req.params;
    const { layoutItems, spaceName } = req.body;
    try {
        const updatedLayout = await TableLayout.findByIdAndUpdate(
            layoutId,
            { layoutItems, spaceName },
            { new: true }
        );
        if (!updatedLayout) {
            return res.status(404).json({ message: "Layout not found" });
        }
        res.status(200).json(updatedLayout);
    } catch (error) {
        res.status(400).json({ message: "Failed to update layout: " + error.message });
    }
};

// Controller for deleting a specific layout
export const deleteLayout = async (req, res) => {
    const { layoutId } = req.params;
    try {
        const deletedLayout = await TableLayout.findByIdAndDelete(layoutId);
        if (!deletedLayout) {
            return res.status(404).json({ message: "Layout not found" });
        }
        res.status(200).json({ message: "Layout deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete layout: " + error.message });
    }
};

