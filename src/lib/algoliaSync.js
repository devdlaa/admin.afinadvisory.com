import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID, 
  process.env.ALGOLIA_ADMIN_API_KEY 
);

const INDEX_NAME = "clients";

/**
 * Format user data for Algolia record
 * Note: objectID is required for all Algolia operations
 */
const formatClientRecord = (user) => ({
  objectID: user.id,  
  firestore_id: user.id,            
  firebase_auth_id: user.uid || null,    
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email || "",
  phoneNumber: user.phoneNumber || "",
  is_crm_user: user?.is_crm_user === true || false  
});

/**
 * Create or update client in Algolia
 * -> Runs async, DOES NOT BLOCK your main API flow
 */
export async function syncClientToAlgolia(userData) {
  try {
    const record = formatClientRecord(userData);
    
    // V5 API: saveObject method on client, requires indexName parameter
    client.saveObject({
      indexName: INDEX_NAME,
      body: record
    })
    .then(() => {
      console.log(`✅ Algolia: Synced user ${userData.id}`);
    })
    .catch(err => {
      console.error("❌ Algolia save error:", err.message);
    });
  } catch (err) {
    console.error("❌ Algolia sync formatting error:", err.message);
  }
}

/**
 * Partial update — call when updating a CRM customer
 * Only specified fields will be updated
 */
export async function updateClientInAlgolia(userId, changes) {
  try {
    
    console.log("changes",changes);

    // V5 API: partialUpdateObject method on client
    client.partialUpdateObject({
      indexName: INDEX_NAME,
      objectID: userId,
      attributesToUpdate: changes,
      createIfNotExists: false 
    })
    .then(() => {
      console.log(`✅ Algolia: Updated user ${userId}`);
    })
    .catch(err => {
      console.error("❌ Algolia update error:", err.message);
    });
  } catch (err) {
    console.error("❌ Algolia update formatting error:", err.message);
  }
}

/**
 * Delete from Algolia
 */
export async function deleteClientFromAlgolia(userId) {
  try {
    // V5 API: deleteObject method on client
    client.deleteObject({
      indexName: INDEX_NAME,
      objectID: userId
    })
    .then(() => {
      console.log(`✅ Algolia: Deleted user ${userId}`);
    })
    .catch(err => {
      console.error("❌ Algolia delete error:", err.message);
    });
  } catch (err) {
    console.error("❌ Algolia delete formatting error:", err.message);
  }
}

/**
 * Batch sync multiple clients (more efficient for bulk operations)
 */
export async function batchSyncClientsToAlgolia(usersArray) {
  try {
    const records = usersArray.map(formatClientRecord);
    
    // V5 API: saveObjects (plural) for batch operations
    client.saveObjects({
      indexName: INDEX_NAME,
      objects: records
    })
    .then(() => {
      console.log(`✅ Algolia: Batch synced ${records.length} users`);
    })
    .catch(err => {
      console.error("❌ Algolia batch save error:", err.message);
    });
  } catch (err) {
    console.error("❌ Algolia batch sync formatting error:", err.message);
  }
}








export async function smartSearch(searchText = "", options = {}) {
  try {
    if (!searchText || !searchText.trim()) {
      return {
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: options.hitsPerPage || 20,
        query: "",
        searchType: "empty",
      };
    }

    const trimmedText = searchText.trim();
    const {
      hitsPerPage = 20,
      page = 0,
      isCrmUser = null,
      attributesToRetrieve = [],
    } = options;

    let searchType = "general";
    let filters = "";
    let query = trimmedText;

    // Detect search type
    if (trimmedText.includes("@")) {
      // Email search
      searchType = "email";
      filters = `email:"${trimmedText}"`;
      query = "";
    } else if (/^\d{10,}$/.test(trimmedText.replace(/[\s\-\(\)]/g, ""))) {
      // Phone number search (10+ digits after removing formatting)
      searchType = "phone";
      const cleanPhone = trimmedText.replace(/[\s\-\(\)]/g, "");
      // FIXED: Search in query mode instead of filter for more flexibility
      query = cleanPhone;
      filters = "";
    } else if (
      /^[a-zA-Z0-9_\-]{20,}$/.test(trimmedText) || 
      trimmedText.match(/^(user|client|cust|uid)_/i)
    ) {
      // ID search
      searchType = "id";
      try {
        const directResult = await client.getObject({
          indexName: INDEX_NAME,
          objectID: trimmedText,
        });
        
        if (directResult) {
          return {
            hits: [directResult],
            nbHits: 1,
            page: 0,
            nbPages: 1,
            hitsPerPage: 1,
            query: trimmedText,
            searchType: "id",
          };
        }
      } catch (err) {
        filters = `firestore_id:"${trimmedText}" OR firebase_auth_id:"${trimmedText}"`;
        query = "";
      }
    } else {
      // Name search (default)
      searchType = "name";
    }

    // Add CRM user filter if specified
    if (isCrmUser !== null) {
      const crmFilter = `is_crm_user:${isCrmUser}`;
      filters = filters ? `${filters} AND ${crmFilter}` : crmFilter;
    }

    // Execute search - V5 API requires 'requests' array format
    const searchRequest = {
      requests: [
        {
          indexName: INDEX_NAME,
          query,
          hitsPerPage,
          page,
          ...(attributesToRetrieve.length > 0 && { attributesToRetrieve }),
          ...(filters && { filters }),
        }
      ]
    };

    const response = await client.search(searchRequest);
    
    // V5 returns results in response.results[0]
    const result = response.results[0];

    return {
      hits: result.hits || [],
      nbHits: result.nbHits || 0,
      page: result.page || 0,
      nbPages: result.nbPages || 0,
      hitsPerPage: result.hitsPerPage || hitsPerPage,
      query: trimmedText,
      searchType,
    };
  } catch (err) {
    console.error("❌ Algolia smart search error:", err.message);
    throw new Error(`Smart search failed: ${err.message}`);
  }
}



export async function getClientById(clientId) {
  try {
    const response = await client.getObject({
      indexName: INDEX_NAME,
      objectID: clientId,
    });

    return response || null;
  } catch (err) {
    if (err.status === 404) {
      return null; // Client not found
    }
    console.error("❌ Algolia get client error:", err.message);
    throw new Error(`Failed to get client: ${err.message}`);
  }
}