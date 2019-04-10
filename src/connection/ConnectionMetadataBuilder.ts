import { importClassesFromDirectories } from "../util/DirectoryExportedClassesLoader";
import { OrmUtils } from "../util/OrmUtils";
import { getFromContainer } from "../container";
import { MigrationInterface } from "../migration/MigrationInterface";
import { getMetadataArgsStorage } from "../index";
import { EntityMetadataBuilder } from "../metadata-builder/EntityMetadataBuilder";
import { EntitySchemaTransformer } from "../entity-schema/EntitySchemaTransformer";
import { Connection } from "./Connection";
import { EntitySchema } from "../entity-schema/EntitySchema";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { EntitySubscriberInterface } from "../subscriber/EntitySubscriberInterface";

/**
 * Builds migration instances, subscriber instances and entity metadatas for the given classes.
 */
export class ConnectionMetadataBuilder {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected connection: Connection) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Builds migration instances for the given classes or directories.
     */
    buildMigrations(migrations: (Function | string)[]): MigrationInterface[] {
        const [migrationClasses, migrationDirectories] = OrmUtils.splitClassesAndStrings(migrations);
        const allMigrationClasses = [...migrationClasses, ...importClassesFromDirectories(migrationDirectories)];
        return allMigrationClasses.map(migrationClass => getFromContainer<MigrationInterface>(migrationClass));
    }

    /**
     * Builds subscriber instances for the given classes or directories.
     */
    buildSubscribers(subscribers: (Function | string)[]): EntitySubscriberInterface<any>[] {
        const [subscriberClasses, subscriberDirectories] = OrmUtils.splitClassesAndStrings(subscribers || []);
        const allSubscriberClasses = [...subscriberClasses, ...importClassesFromDirectories(subscriberDirectories)];
        return getMetadataArgsStorage()
            .filterSubscribers(allSubscriberClasses)
            .map(metadata => getFromContainer<EntitySubscriberInterface<any>>(metadata.target));
    }

    /**
     * Builds entity metadatas for the given classes or directories.
     */
    buildEntityMetadatas(entities: (Function | EntitySchema<any> | string)[]): EntityMetadata[] {
        // todo: instead we need to merge multiple metadata args storages
        console.log("entities", entities);

        const [entityClassesOrSchemas, entityDirectories] = OrmUtils.splitClassesAndStrings(entities || []);
        console.log("entityClassesOrSchemas", entityClassesOrSchemas);
        console.log("entityDirectories", entityDirectories);
        const entityClasses: Function[] = entityClassesOrSchemas.filter(entityClass => (entityClass instanceof EntitySchema) === false) as any;
        const entitySchemas: EntitySchema<any>[] = entityClassesOrSchemas.filter(entityClass => entityClass instanceof EntitySchema) as any;
        console.log("entityClasses", entityClasses);
        console.log("entitySchemas", entitySchemas);

        const allEntityClasses = [...entityClasses, ...importClassesFromDirectories(entityDirectories)];
        console.log("allEntityClasses", allEntityClasses);
        allEntityClasses.forEach(entityClass => { // if we have entity schemas loaded from directories
            if (entityClass instanceof EntitySchema) {
                entitySchemas.push(entityClass);
                allEntityClasses.slice(allEntityClasses.indexOf(entityClass), 1);
            }
        });
        const decoratorEntityMetadatas = new EntityMetadataBuilder(this.connection, getMetadataArgsStorage()).build(allEntityClasses);

        console.log("decoratorEntityMetadatas", decoratorEntityMetadatas);
        const metadataArgsStorageFromSchema = new EntitySchemaTransformer().transform(entitySchemas);
        const schemaEntityMetadatas = new EntityMetadataBuilder(this.connection, metadataArgsStorageFromSchema).build();
        console.log("metadataArgsStorageFromSchema", metadataArgsStorageFromSchema);
        console.log("schemaEntityMetadatas", schemaEntityMetadatas);

        let tmp = [...decoratorEntityMetadatas, ...schemaEntityMetadatas];
        console.log(tmp);
        return tmp;
    }

}
