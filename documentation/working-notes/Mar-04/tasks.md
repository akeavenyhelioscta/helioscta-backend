You are a senior data engineer with deep dbt experience.

  Context:
  - Raw API scrape data is stored in schema `genscape`.
  - I also have legacy dbt schemas:
    - `genscape_v1_2025_dec_08`
    - `dbt_genscape_v2_2026_mar_04`

  Question:
  Should I consolidate everything into the `genscape` schema, or keep separate schemas?       
                                                                                              
  Please analyze and provide:                                                                 
  1. Advantages and disadvantages of moving to a single schema.                               
  2. Key risks (data quality, lineage clarity, permissions, deployment safety, environment    
  isolation).                                                                                 
  3. dbt best-practice architecture for this setup (raw/staging/intermediate/marts            
  separation).                                                                                
  4. A recommended target schema strategy (including naming conventions for prod/dev).        
  5. A step-by-step migration plan with rollback options.                                     
  6. A final recommendation: `Yes`, `No`, or `Conditional`, with clear reasoning.             
                                                                                              
  Constraints:
  - Optimize for maintainability and low operational overhead.                                
  - Preserve governance, auditability, and safe deployment practices.                         
  - State assumptions explicitly where needed.