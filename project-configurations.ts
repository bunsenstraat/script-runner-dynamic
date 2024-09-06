export interface Dependency {
    version: string;
    name: string;
    alias?: string;
    import: boolean;
    require?: boolean;
  }
  
  export interface Replacements {
    [key: string]: string;
  }
  
  export interface ProjectConfiguration {
    name: string;
    description: string;
    dependencies: Dependency[];
    templateDir: string;
    defaultTemplateDir: string;
    tsTemplate: string;
    replacements: Replacements;
  }
  
  export interface ProjectConfigurations {
    projects: ProjectConfiguration[];
  }
  
  export const projectConfigs: ProjectConfigurations = {
    projects: [
      {
        name: "default",
        description: "Default project configuration using ethers and snarkjs",
        dependencies: [
          {
            version: "^5",
            name: "ethers",
            alias: "ethersJS",
            import: true,
          },
          {
            version: "0.7.0",
            name: "snarkjs",
            import: true,
            require: true,
          },
          {
            version: "^4",
            name: "multihashes",
            import: true,
          },
          {
            version: "^1.5.3",
            name: "web3",
            import: false,
          },
        ],
        templateDir: "./templates/",
        defaultTemplateDir: "./templates/default",
        tsTemplate: "template.ts",
        replacements: {
          CUSTOM_CODE: "customCode.ts",
          ADDITIONAL_LOGIC: "additionalLogic.ts",
        },
      },
      // Add other projects here as needed
    ],
  };
  